import type { Addon, BillingStatus, Plan } from '@prisma/client'
import {
  ADDON_ORDER,
  type AddonLine,
  isAddonIncluded,
  isPaidPlan,
  maxAddonQuantity,
  PAID_PLANS,
  type PaidPlan,
  parseAddonLines,
  PLAN_ORDER,
} from './plans.js'
import { HttpError } from '../middleware/error.js'

/**
 * Paddle subscriptions → what a provider holds. Pure, like `plans.ts`: no Prisma client, no
 * Paddle client, `now` and the price ids passed in — `tests/unit/server/billing.spec.ts`
 * reaches every rule here. The I/O lives in `billingSync.ts` and `routes/billing.ts`.
 *
 * **One subscription per provider, with several items**: at most one plan, plus any add-ons
 * (docs/BILLING.md → *Add-ons*), a pack carrying its count as the item's quantity. One
 * renewal date, one invoice.
 *
 * The webhook never decides *what a provider may do*. It writes `plan`, `planExpiresAt` and
 * the `paddle` add-on rows, and `getEntitlements` goes on reading only those — so a
 * subscription is one more writer of what an admin already writes, and no read path changed.
 *
 * The expiry is always set while a subscription is live. If every webhook after this one
 * were lost, the plan and its add-ons would still lapse on their own a few days after the
 * period Paddle last told us about, rather than granting them forever.
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

/**
 * Every Paddle price this deployment recognises, per plan and per add-on. **The first id of
 * each list is the one sold; every id is recognised** — after a price change in Paddle,
 * existing subscribers stay on the old price, and the webhook must go on reading it as what
 * it sold, or they would lose what they are still paying for. Empty lists sell nothing.
 */
export type PaddleCatalogue = {
  plans: Readonly<Record<PaidPlan, readonly string[]>>
  addons: Readonly<Record<Addon, readonly string[]>>
}

/** The id a plan is sold at now, or an empty string where this deployment sells none. */
export const planPriceId = (catalogue: PaddleCatalogue, plan: PaidPlan): string => catalogue.plans[plan][0] ?? ''

/** The id an add-on is sold at now, or an empty string where this deployment sells none. */
export const addonPriceId = (catalogue: PaddleCatalogue, addon: Addon): string => catalogue.addons[addon][0] ?? ''

export type CatalogueItem = { kind: 'plan'; plan: PaidPlan } | { kind: 'addon'; addon: Addon }

/** What a Paddle price sells, or null for a price this deployment does not know. */
export const itemForPriceId = (priceId: string | undefined, catalogue: PaddleCatalogue): CatalogueItem | null => {
  if (!priceId) return null
  const plan = PAID_PLANS.find((candidate) => catalogue.plans[candidate].includes(priceId))
  if (plan) return { kind: 'plan', plan }
  const addon = ADDON_ORDER.find((candidate) => catalogue.addons[candidate].includes(priceId))
  return addon ? { kind: 'addon', addon } : null
}

const BILLING_STATUSES = ['active', 'trialing', 'past_due', 'paused', 'canceled'] as const satisfies readonly BillingStatus[]

const isBillingStatus = (value: unknown): value is BillingStatus => BILLING_STATUSES.includes(value as BillingStatus)

/**
 * One item of a subscription. `inactive` is what Paddle marks an item while the subscription
 * is paused; `trialing` is in a trial and not billed yet, but held.
 */
export type SubscriptionItem = { priceId: string; quantity: number; status: 'active' | 'trialing' | 'inactive' }

/** The fields of Paddle's subscription entity this app reads. Everything else is ignored. */
export type PaddleSubscription = {
  id: string
  status: BillingStatus
  customerId: string
  /** The checkout transaction that created it — present on `subscription.created`. */
  transactionId?: string
  /** What `POST /billing/checkout` put on the transaction, when Paddle carries it over. */
  providerId?: string
  items: SubscriptionItem[]
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
 * A subscription's `items`, as both a webhook payload and `GET /subscriptions/{id}` carry
 * them. An item without a price id is dropped; a missing or odd quantity reads as 1.
 */
export const parseSubscriptionItems = (raw: unknown): SubscriptionItem[] => {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry): SubscriptionItem[] => {
    const item = asRecord(entry)
    const priceId = asString(asRecord(item?.price)?.id) ?? asString(item?.price_id)
    if (!item || !priceId) return []
    const quantity = typeof item.quantity === 'number' && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1
    const status = item.status === 'inactive' || item.status === 'trialing' ? item.status : 'active'
    return [{ priceId, quantity, status }]
  })
}

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
      items: parseSubscriptionItems(data.items),
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

/** Everything one subscription snapshot grants: the provider's columns, and its add-on rows. */
export type BillingSnapshot = {
  fields: BillingFields
  /** The `paddle` add-on rows to hold, each at most once, quantities clamped to the catalogue. */
  addons: AddonLine[]
  /** When those rows lapse — the instant a plan item would. Null when there are none. */
  addonsExpiresAt: Date | null
  /** Items this deployment does not sell, for the log. They grant nothing. */
  unknownPriceIds: string[]
}

/**
 * What a subscription in this state grants, and until when — the plan item and every add-on
 * item alike:
 *
 * | Status | Plan, add-ons | Lapse |
 * |---|---|---|
 * | `active`, `trialing` | the items' | period end + `RENEWAL_GRACE_DAYS` |
 * | … with a cancel or pause scheduled | the items' | exactly when it takes effect |
 * | `past_due` (a renewal failed; Paddle is retrying) | the items' | period start + `PAST_DUE_GRACE_DAYS` |
 * | `paused`, `canceled` | `free`, none | — |
 *
 * A subscription with no plan item — add-ons alone — leaves the provider on `free` with no
 * `planExpiresAt`. Null when not one item is something this deployment sells: granting a
 * guess for an unknown price would be worse than the caller logging it.
 */
export const subscriptionToSnapshot = (
  sub: PaddleSubscription,
  catalogue: PaddleCatalogue,
  now: Date
): BillingSnapshot | null => {
  if (sub.status === 'paused' || sub.status === 'canceled') {
    return {
      fields: { plan: 'free', planExpiresAt: null, billingStatus: sub.status, billingPeriodEndsAt: null, billingCancelsAt: null },
      addons: [],
      addonsExpiresAt: null,
      unknownPriceIds: [],
    }
  }

  let plan: PaidPlan | null = null
  const held = new Map<Addon, number>()
  const unknownPriceIds: string[] = []

  for (const item of sub.items) {
    if (item.status === 'inactive') continue
    const known = itemForPriceId(item.priceId, catalogue)
    if (!known) {
      unknownPriceIds.push(item.priceId)
    } else if (known.kind === 'plan') {
      // Two plan items should never happen; if it does, the provider gets the bigger one.
      if (!plan || PLAN_ORDER.indexOf(known.plan) > PLAN_ORDER.indexOf(plan)) plan = known.plan
    } else {
      const quantity = (held.get(known.addon) ?? 0) + item.quantity
      held.set(known.addon, Math.min(quantity, maxAddonQuantity(known.addon)))
    }
  }

  if (!plan && held.size === 0) return null

  const periodEndsAt = sub.periodEndsAt ?? null
  const ending =
    sub.status !== 'past_due' && sub.scheduledChange && sub.scheduledChange.action !== 'resume' ? sub.scheduledChange : undefined
  const expiresAt =
    sub.status === 'past_due'
      ? addDays(sub.periodStartsAt ?? now, PAST_DUE_GRACE_DAYS)
      : (ending?.effectiveAt ?? addDays(periodEndsAt ?? now, RENEWAL_GRACE_DAYS))

  const addons = ADDON_ORDER.filter((addon) => held.has(addon)).map((addon) => ({ addon, quantity: held.get(addon) ?? 1 }))

  return {
    fields: {
      plan: plan ?? 'free',
      planExpiresAt: plan ? expiresAt : null,
      billingStatus: sub.status,
      billingPeriodEndsAt: periodEndsAt,
      billingCancelsAt: ending?.action === 'cancel' ? ending.effectiveAt : null,
    },
    addons,
    addonsExpiresAt: addons.length ? expiresAt : null,
    unknownPriceIds,
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
 *
 * Two deliveries at once can both pass this; `billingSync.ts` writes by compare-and-set on
 * `billingEventAt`, so the second to commit re-reads and decides again.
 */
export const shouldApplyEvent = (event: SubscriptionEvent, stored: ProviderBillingState): boolean => {
  if (stored.billingEventAt && event.occurredAt < stored.billingEventAt) return false

  const incoming = event.subscription
  if (!stored.paddleSubscriptionId || stored.paddleSubscriptionId === incoming.id) return true

  const incomingLive = incoming.status !== 'canceled'
  return incomingLive && !hasLiveSubscription(stored)
}

/** One item as `PATCH /subscriptions/{id}` takes it — the whole list replaces what is there. */
export type SubscriptionLine = { priceId: string; quantity: number }

/** The plan a subscription's items sell — the bigger one should there be two — or `free`. */
export const planOfLines = (lines: readonly SubscriptionLine[], catalogue: PaddleCatalogue): Plan => {
  let plan: Plan = 'free'
  for (const line of lines) {
    const known = itemForPriceId(line.priceId, catalogue)
    if (known?.kind === 'plan' && PLAN_ORDER.indexOf(known.plan) > PLAN_ORDER.indexOf(plan)) plan = known.plan
  }
  return plan
}

/** How many of one add-on a subscription's items hold. */
export const addonQuantityOf = (lines: readonly SubscriptionLine[], addon: Addon, catalogue: PaddleCatalogue): number =>
  lines.reduce((total, line) => {
    const known = itemForPriceId(line.priceId, catalogue)
    return known?.kind === 'addon' && known.addon === addon ? total + line.quantity : total
  }, 0)

/**
 * A subscription's items after switching to `plan`. The plan item is replaced (`free` removes
 * it); every add-on the new plan includes is **dropped**, so nobody pays twice, and returned
 * so the caller can say so; everything else is kept as it is — including the old price id of
 * an add-on bought before a price change, and any item this deployment does not recognise.
 * Switching to the plan already held keeps its own item, old price and all.
 */
export const itemsForPlan = (
  current: readonly SubscriptionLine[],
  plan: Plan,
  catalogue: PaddleCatalogue
): { items: SubscriptionLine[]; dropped: Addon[] } => {
  const items: SubscriptionLine[] = []
  const dropped: Addon[] = []
  let kept: SubscriptionLine | null = null

  for (const line of current) {
    const known = itemForPriceId(line.priceId, catalogue)
    if (known?.kind === 'plan') {
      if (known.plan === plan) kept = line
    } else if (known?.kind === 'addon' && isAddonIncluded(plan, known.addon)) {
      if (!dropped.includes(known.addon)) dropped.push(known.addon)
    } else {
      items.push(line)
    }
  }

  if (isPaidPlan(plan)) items.unshift({ priceId: kept?.priceId ?? planPriceId(catalogue, plan), quantity: 1 })
  return { items, dropped }
}

/**
 * A subscription's items with one add-on set to `quantity`; 0 removes it. An existing line
 * keeps its price id (a subscriber on an old price stays on it); a duplicate line for the
 * same add-on collapses into the first. Every other item is untouched.
 */
export const itemsForAddon = (
  current: readonly SubscriptionLine[],
  addon: Addon,
  quantity: number,
  catalogue: PaddleCatalogue
): SubscriptionLine[] => {
  const items: SubscriptionLine[] = []
  let placed = false

  for (const line of current) {
    const known = itemForPriceId(line.priceId, catalogue)
    if (known?.kind !== 'addon' || known.addon !== addon) {
      items.push(line)
    } else if (!placed && quantity > 0) {
      items.push({ priceId: line.priceId, quantity })
      placed = true
    }
  }

  if (!placed && quantity > 0) items.push({ priceId: addonPriceId(catalogue, addon), quantity })
  return items
}

/** What a checkout sells: a plan, add-ons, or both — at least one of them. */
export type Cart = { plan: PaidPlan | null; addons: AddonLine[] }

/** `POST /billing/checkout`'s body, minus the locale. */
export const parseCart = (body: unknown): Cart => {
  const source = (body ?? {}) as Record<string, unknown>
  const plan = source.plan ?? null
  if (plan !== null && !isPaidPlan(plan)) throw new HttpError(400, `plan must be one of: ${PAID_PLANS.join(', ')}`, 400)
  const addons = parseAddonLines(source.addons)
  if (!plan && addons.length === 0) throw new HttpError(400, 'Choose a plan or an add-on', 400)
  return { plan, addons }
}

/** The cart as Paddle items, at the prices sold now. */
export const cartLines = (cart: Cart, catalogue: PaddleCatalogue): SubscriptionLine[] => [
  ...(cart.plan ? [{ priceId: planPriceId(catalogue, cart.plan), quantity: 1 }] : []),
  ...cart.addons.map((line) => ({ priceId: addonPriceId(catalogue, line.addon), quantity: line.quantity })),
]

/** The add-ons in `lines` that `plan` already includes — never sold on top of it. */
export const includedAddons = (plan: Plan, lines: readonly AddonLine[]): Addon[] =>
  lines.filter((line) => isAddonIncluded(plan, line.addon)).map((line) => line.addon)

/**
 * Paddle codes that mean "not right now" rather than "never": a renewal is being processed,
 * another change is pending, the subscription is past due, or the immediate-charge limits
 * (20 an hour, 100 a day) are spent. The client says so and offers Manage billing, instead
 * of a Retry that would hit the same wall.
 */
export const isChangeUnavailableCode = (code: string | undefined): boolean =>
  Boolean(
    code &&
      (code.startsWith('subscription_locked') ||
        code === 'subscription_update_when_past_due' ||
        code.startsWith('subscription_immediate_charge'))
  )
