import { shouldApplyEvent, type SubscriptionEvent, subscriptionToFields } from './billing.js'
import { planChangeStampReset } from './plans.js'
import { config } from '../config.js'
import { sendInternalMail } from '../lib/mail.js'
import { getTransactionProviderId } from '../lib/paddle.js'
import { prisma } from '../lib/prisma.js'

/**
 * Applies one verified `subscription.*` event to the provider it belongs to — the I/O half
 * of `services/billing.ts`, called only by `POST /billing/webhook`.
 *
 * Idempotent by construction: the event carries the whole subscription, so applying it twice
 * writes the same row twice. That is what makes Paddle's at-least-once delivery, and the
 * doubled delivery during a webhook-secret rotation, safe without an events table.
 *
 * A problem with the *event* — no provider to be found, a price this deployment does not
 * sell — is logged and swallowed, so the route still answers 200: Paddle would otherwise
 * retry an event that can never succeed. A problem on *our* side (the database, Paddle's
 * API during the lookup) throws, and the route answers 500 so Paddle retries it.
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

export const applySubscriptionEvent = async (event: SubscriptionEvent): Promise<void> => {
  const { subscription } = event
  const providerId = await resolveProviderId(event)
  if (!providerId) {
    console.error(`[billing] ${event.eventType} ${event.eventId}: no provider for subscription ${subscription.id}`)
    return
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      plan: true,
      planExpiresAt: true,
      paddleSubscriptionId: true,
      billingStatus: true,
      billingEventAt: true,
      user: { select: { email: true } },
    },
  })
  if (!provider) {
    console.error(`[billing] ${event.eventType} ${event.eventId}: provider ${providerId} does not exist`)
    return
  }

  if (!shouldApplyEvent(event, provider)) {
    console.info(`[billing] ${event.eventType} ${event.eventId}: superseded for provider ${provider.id}, skipped`)
    return
  }

  const now = new Date()
  const fields = subscriptionToFields(subscription, config.paddle.priceIds, now)
  if (!fields) {
    console.error(
      `[billing] ${event.eventType} ${event.eventId}: price ${subscription.priceId ?? 'none'} is not a configured plan`
    )
    return
  }

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      ...fields,
      ...planChangeStampReset(provider, fields, now),
      paddleCustomerId: subscription.customerId,
      paddleSubscriptionId: subscription.id,
      billingEventAt: event.occurredAt,
    },
  })

  console.info(
    `[billing] ${event.eventType} ${event.eventId}: provider ${provider.id} ${provider.plan} -> ${fields.plan}` +
      ` (${fields.billingStatus}, until ${fields.planExpiresAt?.toISOString() ?? 'no end'})`
  )

  const headline = ANNOUNCED_EVENTS[event.eventType]
  if (headline) {
    const name = `${provider.firstName} ${provider.lastName}`.trim()
    // Fire-and-forget, like regionify's purchase notification: the row is written, and an
    // inbox line must never turn a successful sync into a Paddle retry.
    void sendInternalMail({
      subject: `${headline} — ${fields.plan} — ${name}`,
      body: `${headline}: ${name} (${provider.user.email}) is now on ${fields.plan}, status ${fields.billingStatus}.`,
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
}
