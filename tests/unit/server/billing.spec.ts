import { describe, expect, it } from 'vitest'
// Relative, not aliased: `server/` is a separate package. Both modules are pure — the
// signature check imports only `node:crypto`, the rules take `now` and the price ids.
import { signPaddlePayload, verifyPaddleSignature } from '../../../server/src/lib/paddle-signature'
import {
  hasLiveSubscription,
  type PaddleSubscription,
  parseSubscriptionEvent,
  PAST_DUE_GRACE_DAYS,
  planForPriceId,
  RENEWAL_GRACE_DAYS,
  shouldApplyEvent,
  type SubscriptionEvent,
  subscriptionToFields,
} from '../../../server/src/services/billing'

const PRICE_IDS = { basic: 'pri_basic', standard: 'pri_standard', premium: 'pri_premium' }
const NOW = new Date('2026-10-04T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const plusDays = (iso: string, days: number): Date => new Date(new Date(iso).getTime() + days * DAY_MS)

const subscription = (overrides: Partial<PaddleSubscription> = {}): PaddleSubscription => ({
  id: 'sub_1',
  status: 'active',
  customerId: 'ctm_1',
  priceId: 'pri_standard',
  periodStartsAt: new Date('2026-10-01T00:00:00.000Z'),
  periodEndsAt: new Date('2026-11-01T00:00:00.000Z'),
  ...overrides,
})

const event = (sub: PaddleSubscription, occurredAt = '2026-10-04T10:00:00.000Z'): SubscriptionEvent => ({
  eventId: 'evt_1',
  eventType: 'subscription.updated',
  occurredAt: new Date(occurredAt),
  subscription: sub,
})

describe('verifyPaddleSignature', () => {
  const body = Buffer.from('{"event_type":"subscription.created","data":{"id":"sub_1"}}')

  it('accepts a body signed with the configured secret', () => {
    const header = signPaddlePayload(body, 'pdl_secret', 1_700_000_000)
    expect(verifyPaddleSignature(body, header, ['pdl_secret'])).toEqual({ ok: true, secretIndex: 0 })
  })

  // The signature covers the exact bytes — a re-serialised body is a different body.
  it('rejects a body changed after signing', () => {
    const header = signPaddlePayload(body, 'pdl_secret', 1_700_000_000)
    const tampered = Buffer.from(body.toString().replace('sub_1', 'sub_2'))
    expect(verifyPaddleSignature(tampered, header, ['pdl_secret'])).toEqual({ ok: false })
  })

  it('rejects a signature made with another secret', () => {
    const header = signPaddlePayload(body, 'pdl_other', 1_700_000_000)
    expect(verifyPaddleSignature(body, header, ['pdl_secret'])).toEqual({ ok: false })
  })

  // During a rotation two destinations are live; the second secret must still verify, and
  // say so, so the caller can log that the rotation is unfinished.
  it('accepts a fallback secret and reports which one matched', () => {
    const header = signPaddlePayload(body, 'pdl_old', 1_700_000_000)
    expect(verifyPaddleSignature(body, header, ['pdl_new', 'pdl_old'])).toEqual({ ok: true, secretIndex: 1 })
  })

  it('checks every h1 in the header', () => {
    const valid = signPaddlePayload(body, 'pdl_secret', 1_700_000_000).split(';')[1]
    expect(verifyPaddleSignature(body, `ts=1700000000;h1=deadbeef;${valid}`, ['pdl_secret']).ok).toBe(true)
  })

  it('rejects a malformed header, and everything when no secret is configured', () => {
    expect(verifyPaddleSignature(body, 'nonsense', ['pdl_secret']).ok).toBe(false)
    expect(verifyPaddleSignature(body, 'ts=1;h1=', ['pdl_secret']).ok).toBe(false)
    expect(verifyPaddleSignature(body, signPaddlePayload(body, 'x', 1), []).ok).toBe(false)
  })
})

describe('parseSubscriptionEvent', () => {
  const payload = {
    event_id: 'evt_9',
    event_type: 'subscription.created',
    occurred_at: '2026-10-04T10:00:00.000Z',
    data: {
      id: 'sub_9',
      status: 'active',
      customer_id: 'ctm_9',
      transaction_id: 'txn_9',
      custom_data: { provider_id: 'prov_9' },
      items: [{ price: { id: 'pri_basic' } }],
      current_billing_period: { starts_at: '2026-10-04T10:00:00.000Z', ends_at: '2026-11-04T10:00:00.000Z' },
      scheduled_change: null,
    },
  }

  it('reads the fields the webhook acts on', () => {
    const parsed = parseSubscriptionEvent(payload)
    expect(parsed).toMatchObject({
      eventId: 'evt_9',
      eventType: 'subscription.created',
      subscription: {
        id: 'sub_9',
        status: 'active',
        customerId: 'ctm_9',
        transactionId: 'txn_9',
        providerId: 'prov_9',
        priceId: 'pri_basic',
        scheduledChange: undefined,
      },
    })
    expect(parsed?.subscription.periodEndsAt?.toISOString()).toBe('2026-11-04T10:00:00.000Z')
  })

  it('reads a scheduled cancellation', () => {
    const parsed = parseSubscriptionEvent({
      ...payload,
      data: { ...payload.data, scheduled_change: { action: 'cancel', effective_at: '2026-11-04T10:00:00.000Z' } },
    })
    expect(parsed?.subscription.scheduledChange?.action).toBe('cancel')
  })

  it('ignores anything that is not a subscription event', () => {
    expect(parseSubscriptionEvent({ ...payload, event_type: 'transaction.completed' })).toBeNull()
    expect(parseSubscriptionEvent(null)).toBeNull()
  })

  it('refuses a subscription event it cannot derive state from', () => {
    expect(parseSubscriptionEvent({ ...payload, data: { ...payload.data, status: 'mystery' } })).toBeNull()
    expect(parseSubscriptionEvent({ ...payload, occurred_at: 'yesterday' })).toBeNull()
  })
})

describe('planForPriceId', () => {
  it('maps each configured price to its plan, and nothing else', () => {
    expect(planForPriceId('pri_premium', PRICE_IDS)).toBe('premium')
    expect(planForPriceId('pri_unknown', PRICE_IDS)).toBeNull()
    expect(planForPriceId(undefined, PRICE_IDS)).toBeNull()
  })

  // An unset price id is '' in config; an empty incoming id must not match it.
  it('never matches an unconfigured plan', () => {
    expect(planForPriceId('', { ...PRICE_IDS, basic: '' })).toBeNull()
  })
})

describe('subscriptionToFields', () => {
  it('grants an active subscription its plan until the period ends, plus grace', () => {
    expect(subscriptionToFields(subscription(), PRICE_IDS, NOW)).toEqual({
      plan: 'standard',
      planExpiresAt: plusDays('2026-11-01T00:00:00.000Z', RENEWAL_GRACE_DAYS),
      billingStatus: 'active',
      billingPeriodEndsAt: new Date('2026-11-01T00:00:00.000Z'),
      billingCancelsAt: null,
    })
  })

  // A voluntary cancellation ends exactly when it takes effect — no grace on top.
  it('ends a plan with a scheduled cancellation exactly when it takes effect', () => {
    const effectiveAt = new Date('2026-11-01T00:00:00.000Z')
    const fields = subscriptionToFields(
      subscription({ scheduledChange: { action: 'cancel', effectiveAt } }),
      PRICE_IDS,
      NOW
    )
    expect(fields?.planExpiresAt).toEqual(effectiveAt)
    expect(fields?.billingCancelsAt).toEqual(effectiveAt)
  })

  it('keeps a past-due plan for the dunning grace, counted from the unpaid period', () => {
    const fields = subscriptionToFields(subscription({ status: 'past_due' }), PRICE_IDS, NOW)
    expect(fields?.plan).toBe('standard')
    expect(fields?.planExpiresAt).toEqual(plusDays('2026-10-01T00:00:00.000Z', PAST_DUE_GRACE_DAYS))
  })

  it.each(['paused', 'canceled'] as const)('drops a %s subscription to free with no expiry', (status) => {
    expect(subscriptionToFields(subscription({ status }), PRICE_IDS, NOW)).toMatchObject({
      plan: 'free',
      planExpiresAt: null,
      billingStatus: status,
    })
  })

  it('grants nothing for a price this deployment does not sell', () => {
    expect(subscriptionToFields(subscription({ priceId: 'pri_other' }), PRICE_IDS, NOW)).toBeNull()
  })
})

describe('shouldApplyEvent', () => {
  const stored = { paddleSubscriptionId: 'sub_1', billingStatus: 'active' as const, billingEventAt: new Date('2026-10-04T10:00:00.000Z') }

  it('applies the first event a provider ever gets', () => {
    expect(shouldApplyEvent(event(subscription()), { paddleSubscriptionId: null, billingStatus: null, billingEventAt: null })).toBe(true)
  })

  // Paddle delivers out of order: an older snapshot must not roll the state back.
  it('ignores an event older than the last one applied', () => {
    expect(shouldApplyEvent(event(subscription(), '2026-10-04T09:59:59.000Z'), stored)).toBe(false)
  })

  // One change can emit several events at the same instant, each with the same snapshot.
  it('applies an event at the same instant as the last one', () => {
    expect(shouldApplyEvent(event(subscription(), '2026-10-04T10:00:00.000Z'), stored)).toBe(true)
  })

  it('ignores a late event from an old subscription once a new one is live', () => {
    const late = event(subscription({ id: 'sub_0', status: 'canceled' }), '2026-10-05T00:00:00.000Z')
    expect(shouldApplyEvent(late, stored)).toBe(false)
  })

  it('takes a new live subscription over a cancelled one', () => {
    const fresh = event(subscription({ id: 'sub_2' }), '2026-10-05T00:00:00.000Z')
    expect(shouldApplyEvent(fresh, { ...stored, billingStatus: 'canceled' })).toBe(true)
  })
})

describe('hasLiveSubscription', () => {
  it('counts every status but cancelled — a paused one can be resumed', () => {
    expect(hasLiveSubscription({ paddleSubscriptionId: 'sub_1', billingStatus: 'paused' })).toBe(true)
    expect(hasLiveSubscription({ paddleSubscriptionId: 'sub_1', billingStatus: 'canceled' })).toBe(false)
    expect(hasLiveSubscription({ paddleSubscriptionId: null, billingStatus: null })).toBe(false)
  })
})
