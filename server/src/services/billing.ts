import type { BillingStatus, Plan } from '@prisma/client'
import { PAID_PLANS, type PaidPlan } from './plans.js'

/**
 * Paddle subscriptions → the plan a provider holds. Pure, like `plans.ts`: no Prisma client,
 * no Paddle client, `now` and the price ids passed in — `tests/unit/server/billing.spec.ts`
 * reaches every rule here. The I/O lives in `billingSync.ts` and `routes/billing.ts`.
 *
 * The webhook never decides *what a provider may do*. It writes `plan` and `planExpiresAt`,
 * and `getEntitlements` goes on reading only those — so a subscription is one more writer of
 * the two columns an admin already writes, and no read path changed (docs/BILLING.md).
 *
 * The expiry is always set while a subscription is live. If every webhook after this one
 * were lost, the plan would still lapse on its own a few days after the period Paddle last
 * told us about, rather than granting a paid plan forever.
 */

/** Days a renewal may run late — a slow card network, a delayed webhook — before the plan lapses. */
export const RENEWAL_GRACE_DAYS = 3
/**
 * Days a failed renewal keeps the plan while Paddle retries the card (dunning). Counted from
 * the start of the unpaid period, so repeated `past_due` events cannot stretch it.
 */
export const PAST_DUE_GRACE_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS)

export type PriceIds = Readonly<Record<PaidPlan, string>>

/** The plan a Paddle price sells, or null for a price this deployment does not know. */
export const planForPriceId = (priceId: string | undefined, priceIds: PriceIds): PaidPlan | null => {
  if (!priceId) return null
  return PAID_PLANS.find((plan) => priceIds[plan] === priceId) ?? null
}

const BILLING_STATUSES = ['active', 'trialing', 'past_due', 'paused', 'canceled'] as const satisfies readonly BillingStatus[]

const isBillingStatus = (value: unknown): value is BillingStatus => BILLING_STATUSES.includes(value as BillingStatus)

/** The fields of Paddle's subscription entity this app reads. Everything else is ignored. */
export type PaddleSubscription = {
  id: string
  status: BillingStatus
  customerId: string
  /** The checkout transaction that created it — present on `subscription.created`. */
  transactionId?: string
  /** What `POST /billing/checkout` put on the transaction, when Paddle carries it over. */
  providerId?: string
  priceId?: string
  periodStartsAt?: Date
  periodEndsAt?: Date
  scheduledChange?: { action: 'cancel' | 'pause' | 'resume'; effectiveAt: Date }
}

export type SubscriptionEvent = {
  eventId: string
  eventType: string
  occurredAt: Date
  subscription: PaddleSubscription
}

const asString = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined)

const asDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

/**
 * A `subscription.*` notification, narrowed to what the webhook acts on — or null for any
 * other event type, or a payload missing a field the state cannot be derived without.
 * Every subscription event carries the whole entity, so one parser serves all of them:
 * Paddle's own guidance is that `subscription.updated` alone covers renewals, plan changes
 * and status changes.
 */
export const parseSubscriptionEvent = (body: unknown): SubscriptionEvent | null => {
  const root = asRecord(body)
  const eventType = asString(root?.event_type)
  if (!root || !eventType?.startsWith('subscription.')) return null

  const data = asRecord(root.data)
  const id = asString(data?.id)
  const customerId = asString(data?.customer_id)
  const status = data?.status
  const occurredAt = asDate(root.occurred_at)
  if (!data || !id || !customerId || !isBillingStatus(status) || !occurredAt) return null

  const items = Array.isArray(data.items) ? data.items : []
  const firstPrice = asRecord(asRecord(items[0])?.price)
  const period = asRecord(data.current_billing_period)
  const scheduled = asRecord(data.scheduled_change)
  const scheduledAction = scheduled?.action
  const scheduledAt = asDate(scheduled?.effective_at)

  return {
    eventId: asString(root.event_id) ?? '',
    eventType,
    occurredAt,
    subscription: {
      id,
      status,
      customerId,
      transactionId: asString(data.transaction_id),
      providerId: asString(asRecord(data.custom_data)?.provider_id),
      priceId: asString(firstPrice?.id),
      periodStartsAt: asDate(period?.starts_at),
      periodEndsAt: asDate(period?.ends_at),
      scheduledChange:
        (scheduledAction === 'cancel' || scheduledAction === 'pause' || scheduledAction === 'resume') && scheduledAt
          ? { action: scheduledAction, effectiveAt: scheduledAt }
          : undefined,
    },
  }
}

/** What the webhook writes onto `Provider` for one subscription snapshot. */
export type BillingFields = {
  plan: Plan
  planExpiresAt: Date | null
  billingStatus: BillingStatus
  billingPeriodEndsAt: Date | null
  billingCancelsAt: Date | null
}

/**
 * The plan a subscription in this state grants, and until when:
 *
 * | Status | Plan | Lapses |
 * |---|---|---|
 * | `active`, `trialing` | the price's plan | period end + `RENEWAL_GRACE_DAYS` |
 * | … with a cancel or pause scheduled | the price's plan | exactly when it takes effect |
 * | `past_due` (a renewal failed; Paddle is retrying) | the price's plan | period start + `PAST_DUE_GRACE_DAYS` |
 * | `paused`, `canceled` | `free` | — |
 *
 * Null when the price is not one of this deployment's: granting *some* plan for an unknown
 * price would be a guess, and the caller logs it instead.
 */
export const subscriptionToFields = (sub: PaddleSubscription, priceIds: PriceIds, now: Date): BillingFields | null => {
  if (sub.status === 'paused' || sub.status === 'canceled') {
    return {
      plan: 'free',
      planExpiresAt: null,
      billingStatus: sub.status,
      billingPeriodEndsAt: null,
      billingCancelsAt: null,
    }
  }

  const plan = planForPriceId(sub.priceId, priceIds)
  if (!plan) return null

  const periodEndsAt = sub.periodEndsAt ?? null

  if (sub.status === 'past_due') {
    return {
      plan,
      planExpiresAt: addDays(sub.periodStartsAt ?? now, PAST_DUE_GRACE_DAYS),
      billingStatus: sub.status,
      billingPeriodEndsAt: periodEndsAt,
      billingCancelsAt: null,
    }
  }

  const ending = sub.scheduledChange && sub.scheduledChange.action !== 'resume' ? sub.scheduledChange : undefined

  return {
    plan,
    planExpiresAt: ending ? ending.effectiveAt : addDays(periodEndsAt ?? now, RENEWAL_GRACE_DAYS),
    billingStatus: sub.status,
    billingPeriodEndsAt: periodEndsAt,
    billingCancelsAt: ending?.action === 'cancel' ? ending.effectiveAt : null,
  }
}

/** A provider's billing columns, as the webhook reads them before writing. */
export type ProviderBillingState = {
  paddleSubscriptionId: string | null
  billingStatus: BillingStatus | null
  billingEventAt: Date | null
}

/** A subscription that exists and has not ended — paused counts, because it can be resumed. */
export const hasLiveSubscription = (state: Pick<ProviderBillingState, 'paddleSubscriptionId' | 'billingStatus'>): boolean =>
  Boolean(state.paddleSubscriptionId) && state.billingStatus !== null && state.billingStatus !== 'canceled'

/**
 * Whether one event may overwrite what is stored. Paddle delivers at least once and in no
 * guaranteed order, so two rules:
 *
 * - **Older than the last applied event → ignored.** Equal is applied: one change can emit
 *   several events at the same instant (`subscription.updated` beside `.past_due`), and
 *   each carries the same snapshot.
 * - **Another subscription's event** is applied only when it is live and the stored one is
 *   not — a provider who cancelled and later subscribed again. A late event from the old
 *   subscription must not cancel the new one.
 */
export const shouldApplyEvent = (event: SubscriptionEvent, stored: ProviderBillingState): boolean => {
  if (stored.billingEventAt && event.occurredAt < stored.billingEventAt) return false

  const incoming = event.subscription
  if (!stored.paddleSubscriptionId || stored.paddleSubscriptionId === incoming.id) return true

  const incomingLive = incoming.status !== 'canceled'
  return incomingLive && !hasLiveSubscription(stored)
}
