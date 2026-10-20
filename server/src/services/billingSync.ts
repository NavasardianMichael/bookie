import { type BillingSnapshot, shouldApplyEvent, type SubscriptionEvent, subscriptionToSnapshot } from './billing.js'
import { ADDON_GRANT_SELECT, type AddonGrant, planChangeStampReset } from './plans.js'
import { config } from '../config.js'
import { sendInternalMail } from '../lib/mail.js'
import { getTransactionProviderId } from '../lib/paddle.js'
import { prisma } from '../lib/prisma.js'

/**
 * Applies one verified `subscription.*` event to the provider it belongs to — the I/O half
 * of `services/billing.ts`, called only by `POST /billing/webhook`.
 *
 * Idempotent by construction: the event carries the whole subscription, so applying it twice
 * writes the same rows twice. That is what makes Paddle's at-least-once delivery, and the
 * doubled delivery during a webhook-secret rotation, safe without an events table.
 *
 * **One transaction, claimed by compare-and-set.** The provider's columns and its `paddle`
 * add-on rows are written together, and the write only lands if `billingEventAt` is still what
 * was read. Two deliveries racing each other could otherwise both pass `shouldApplyEvent` and
 * let the older snapshot commit last; the loser re-reads and decides again.
 *
 * A problem with the *event* — no provider to be found, no item this deployment sells — is
 * logged and swallowed, so the route still answers 200: Paddle would otherwise retry an event
 * that can never succeed. A problem on *our* side (the database, Paddle's API during the
 * lookup, a race that will not settle) throws, and the route answers 500 so Paddle retries it.
 */

/**
 * The provider an event belongs to, in order of how much it can be trusted:
 *
 * 1. the provider already holding this subscription — every event after the first;
 * 2. `custom_data.provider_id` on the subscription, which `POST /billing/checkout` set on
 *    the transaction;
 * 3. that transaction's own `custom_data`, read back from Paddle — the documented home of
 *    the field, for when Paddle has not carried it onto the subscription.
 */
const resolveProviderId = async (event: SubscriptionEvent): Promise<string | undefined> => {
  const { subscription } = event

  const holder = await prisma.provider.findUnique({
    where: { paddleSubscriptionId: subscription.id },
    select: { id: true },
  })
  if (holder) return holder.id

  if (subscription.providerId) return subscription.providerId
  if (subscription.transactionId) return getTransactionProviderId(subscription.transactionId)
  return undefined
}

/** Worth an inbox line: someone started paying, stopped, or a card is failing. */
const ANNOUNCED_EVENTS: Record<string, string> = {
  'subscription.created': 'New subscription',
  'subscription.canceled': 'Subscription cancelled',
  'subscription.past_due': 'Subscription payment failed',
}

const PROVIDER_SELECT = {
  id: true,
  fullName: true,
  plan: true,
  planExpiresAt: true,
  paddleSubscriptionId: true,
  billingStatus: true,
  billingEventAt: true,
  addons: { select: ADDON_GRANT_SELECT },
  user: { select: { email: true } },
} as const

/** A read, a compare-and-set that lost, a re-read: past that, Paddle's own retry takes over. */
const MAX_ATTEMPTS = 2

/** `basic + customSlug, extraServices ×2` — what a snapshot grants, for the log and the inbox. */
const describe = (snapshot: BillingSnapshot): string =>
  [
    snapshot.fields.plan,
    ...snapshot.addons.map((line) => (line.quantity > 1 ? `${line.addon} ×${line.quantity}` : line.addon)),
  ].join(' + ')

type Outcome = 'done' | 'raced'

const applyOnce = async (event: SubscriptionEvent, providerId: string): Promise<Outcome> => {
  const { subscription } = event

  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: PROVIDER_SELECT })
  if (!provider) {
    console.error(`[billing] ${event.eventType} ${event.eventId}: provider ${providerId} does not exist`)
    return 'done'
  }

  if (!shouldApplyEvent(event, provider)) {
    console.info(`[billing] ${event.eventType} ${event.eventId}: superseded for provider ${provider.id}, skipped`)
    return 'done'
  }

  const now = new Date()
  const snapshot = subscriptionToSnapshot(subscription, config.paddle.catalogue, now)
  if (!snapshot) {
    const prices = subscription.items.map((item) => item.priceId).join(', ') || 'none'
    console.error(`[billing] ${event.eventType} ${event.eventId}: no item is a configured plan or add-on (${prices})`)
    return 'done'
  }
  if (snapshot.unknownPriceIds.length) {
    console.warn(
      `[billing] ${event.eventType} ${event.eventId}: ignored prices this deployment does not sell: ${snapshot.unknownPriceIds.join(', ')}`
    )
  }

  const paddleRows = snapshot.addons.map(
    (line): AddonGrant => ({ ...line, source: 'paddle', expiresAt: snapshot.addonsExpiresAt })
  )
  // An admin's grant survives a webhook, so it counts towards the allowance either side.
  const next = {
    ...snapshot.fields,
    addons: [...provider.addons.filter((grant) => grant.source !== 'paddle'), ...paddleRows],
  }

  const applied = await prisma.$transaction(async (tx) => {
    const { count } = await tx.provider.updateMany({
      where: { id: provider.id, billingEventAt: provider.billingEventAt },
      data: {
        ...snapshot.fields,
        ...planChangeStampReset(provider, next, now),
        paddleCustomerId: subscription.customerId,
        paddleSubscriptionId: subscription.id,
        billingEventAt: event.occurredAt,
      },
    })
    if (count !== 1) return false

    await tx.providerAddon.deleteMany({ where: { providerId: provider.id, source: 'paddle' } })
    if (paddleRows.length) {
      await tx.providerAddon.createMany({ data: paddleRows.map((row) => ({ providerId: provider.id, ...row })) })
    }
    return true
  })

  if (!applied) {
    console.info(`[billing] ${event.eventType} ${event.eventId}: provider ${provider.id} changed concurrently, re-reading`)
    return 'raced'
  }

  const holds = describe(snapshot)
  console.info(
    `[billing] ${event.eventType} ${event.eventId}: provider ${provider.id} ${provider.plan} -> ${holds}` +
      ` (${snapshot.fields.billingStatus}, until ${(snapshot.fields.planExpiresAt ?? snapshot.addonsExpiresAt)?.toISOString() ?? 'no end'})`
  )

  const headline = ANNOUNCED_EVENTS[event.eventType]
  if (headline) {
    const name = provider.fullName.trim()
    // Fire-and-forget, like regionify's purchase notification: the row is written, and an
    // inbox line must never turn a successful sync into a Paddle retry.
    void sendInternalMail({
      subject: `${headline} — ${holds} — ${name}`,
      body: `${headline}: ${name} (${provider.user.email}) now holds ${holds}, status ${snapshot.fields.billingStatus}.`,
      details: {
        providerId: provider.id,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        eventId: event.eventId,
        sandbox: config.paddle.sandbox,
      },
    }).then((result) => {
      if (!result.ok) console.error(`[billing] admin notice failed: ${result.status} ${result.message}`)
    })
  }

  return 'done'
}

export const applySubscriptionEvent = async (event: SubscriptionEvent): Promise<void> => {
  const providerId = await resolveProviderId(event)
  if (!providerId) {
    console.error(`[billing] ${event.eventType} ${event.eventId}: no provider for subscription ${event.subscription.id}`)
    return
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if ((await applyOnce(event, providerId)) === 'done') return
  }

  // Still losing to concurrent writes: a 500, so Paddle delivers it again later.
  throw new Error(`[billing] ${event.eventType} ${event.eventId}: provider ${providerId} kept changing; left for Paddle to retry`)
}
