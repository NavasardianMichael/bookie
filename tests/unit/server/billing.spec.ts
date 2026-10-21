import { describe, expect, it } from 'vitest'
// Relative, not aliased: `server/` is a separate package. Both modules are pure — the
// signature check imports only `node:crypto`, the rules take `now` and the price ids.
import { createKeyedLock } from '../../../server/src/lib/keyed-lock'
import { signPaddlePayload, verifyPaddleSignature } from '../../../server/src/lib/paddle-signature'
import {
  addonQuantityOf,
  cartLines,
  hasLiveSubscription,
  includedAddons,
  isChangeUnavailableCode,
  itemForPriceId,
  itemsForAddon,
  itemsForPlan,
  type PaddleCatalogue,
  type PaddleSubscription,
  parseCart,
  parseSubscriptionEvent,
  PAST_DUE_GRACE_DAYS,
  planOfLines,
  RENEWAL_GRACE_DAYS,
  shouldApplyEvent,
  type SubscriptionEvent,
  subscriptionToSnapshot,
  toPaymentHistory,
} from '../../../server/src/services/billing'

/** Each list's first id is the one sold; `pri_slug_old` is a retired price still recognised. */
const CATALOGUE: PaddleCatalogue = {
  plans: { basic: ['pri_basic'], standard: ['pri_standard'], premium: ['pri_premium'] },
  addons: {
    customSlug: ['pri_slug', 'pri_slug_old'],
    telegramNotifications: ['pri_telegram'],
    calendarFeed: ['pri_calendar'],
    removeBranding: ['pri_branding'],
    extraServices: ['pri_services'],
    extraBookings: [],
  },
}
const NOW = new Date('2026-10-04T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const plusDays = (iso: string, days: number): Date => new Date(new Date(iso).getTime() + days * DAY_MS)

const item = (priceId: string, quantity = 1, status: 'active' | 'trialing' | 'inactive' = 'active') => ({
  priceId,
  quantity,
  status,
})

const subscription = (overrides: Partial<PaddleSubscription> = {}): PaddleSubscription => ({
  id: 'sub_1',
  status: 'active',
  customerId: 'ctm_1',
  items: [item('pri_standard')],
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

describe('toPaymentHistory', () => {
  const charge = {
    id: 'txn_1',
    status: 'completed',
    billed_at: '2026-10-04T10:00:00.000Z',
    currency_code: 'USD',
    items: [
      { price: { id: 'pri_basic' }, quantity: 1 },
      { price: { id: 'pri_slug_old' }, quantity: 1 },
      { price: { id: 'pri_unknown' }, quantity: 1 },
    ],
    details: { totals: { grand_total: '1990', currency_code: 'USD' } },
  }

  it('keeps settled charges, names our prices, and converts minor units', () => {
    expect(toPaymentHistory([charge, { ...charge, id: 'txn_draft', status: 'draft' }], CATALOGUE)).toEqual([
      {
        id: 'txn_1',
        paidAt: '2026-10-04T10:00:00.000Z',
        status: 'paid',
        currency: 'USD',
        total: 19.9,
        plan: 'basic',
        addons: [{ addon: 'customSlug', quantity: 1 }],
      },
    ])
  })

  it('sorts newest first and leaves a zero-decimal currency whole', () => {
    const older = { ...charge, id: 'txn_old', billed_at: '2026-09-01T00:00:00.000Z' }
    const yen = {
      ...charge,
      id: 'txn_yen',
      currency_code: 'JPY',
      billed_at: '2026-10-20T00:00:00.000Z',
      details: { totals: { total: '1990' } },
    }
    expect(toPaymentHistory([older, yen], CATALOGUE).map((row) => [row.id, row.total])).toEqual([
      ['txn_yen', 1990],
      ['txn_old', 19.9],
    ])
  })
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
      items: [
        { price: { id: 'pri_basic' }, quantity: 1, status: 'active' },
        { price: { id: 'pri_services' }, quantity: 3, status: 'active' },
      ],
      current_billing_period: { starts_at: '2026-10-04T10:00:00.000Z', ends_at: '2026-11-04T10:00:00.000Z' },
      scheduled_change: null,
    },
  }

  it('reads the fields the webhook acts on, every item included', () => {
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
        items: [item('pri_basic'), item('pri_services', 3)],
        scheduledChange: undefined,
      },
    })
    expect(parsed?.subscription.periodEndsAt?.toISOString()).toBe('2026-11-04T10:00:00.000Z')
  })

  it('reads an odd quantity as one, and drops an item with no price', () => {
    const parsed = parseSubscriptionEvent({
      ...payload,
      data: { ...payload.data, items: [{ price: { id: 'pri_basic' }, quantity: 'two' }, { quantity: 2 }] },
    })
    expect(parsed?.subscription.items).toEqual([item('pri_basic')])
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

describe('itemForPriceId', () => {
  it('maps each configured price to its plan or add-on, and nothing else', () => {
    expect(itemForPriceId('pri_premium', CATALOGUE)).toEqual({ kind: 'plan', plan: 'premium' })
    expect(itemForPriceId('pri_services', CATALOGUE)).toEqual({ kind: 'addon', addon: 'extraServices' })
    expect(itemForPriceId('pri_unknown', CATALOGUE)).toBeNull()
    expect(itemForPriceId(undefined, CATALOGUE)).toBeNull()
  })

  // After a price change the old subscribers stay on the old price; they still hold it.
  it('recognises a retired price that is no longer sold', () => {
    expect(itemForPriceId('pri_slug_old', CATALOGUE)).toEqual({ kind: 'addon', addon: 'customSlug' })
  })

  // An empty incoming id must never match an unconfigured plan or add-on.
  it('never matches an empty id', () => {
    expect(itemForPriceId('', CATALOGUE)).toBeNull()
  })
})

describe('subscriptionToSnapshot', () => {
  it('grants an active subscription its plan until the period ends, plus grace', () => {
    expect(subscriptionToSnapshot(subscription(), CATALOGUE, NOW)).toEqual({
      fields: {
        plan: 'standard',
        planExpiresAt: plusDays('2026-11-01T00:00:00.000Z', RENEWAL_GRACE_DAYS),
        billingStatus: 'active',
        billingPeriodEndsAt: new Date('2026-11-01T00:00:00.000Z'),
        billingCancelsAt: null,
      },
      addons: [],
      addonsExpiresAt: null,
      unknownPriceIds: [],
    })
  })

  it('grants a plan and its add-ons the same lapse', () => {
    const snapshot = subscriptionToSnapshot(
      subscription({ items: [item('pri_basic'), item('pri_services', 2), item('pri_slug_old')] }),
      CATALOGUE,
      NOW
    )
    expect(snapshot?.fields.plan).toBe('basic')
    expect(snapshot?.addons).toEqual([
      { addon: 'customSlug', quantity: 1 },
      { addon: 'extraServices', quantity: 2 },
    ])
    expect(snapshot?.addonsExpiresAt).toEqual(snapshot?.fields.planExpiresAt)
  })

  // Add-ons alone: the provider stays on Free, which has nothing to lapse from.
  it('leaves an add-on-only subscription on free with no plan expiry', () => {
    const snapshot = subscriptionToSnapshot(subscription({ items: [item('pri_slug')] }), CATALOGUE, NOW)
    expect(snapshot?.fields).toMatchObject({ plan: 'free', planExpiresAt: null, billingStatus: 'active' })
    expect(snapshot?.addons).toEqual([{ addon: 'customSlug', quantity: 1 }])
    expect(snapshot?.addonsExpiresAt).toEqual(plusDays('2026-11-01T00:00:00.000Z', RENEWAL_GRACE_DAYS))
  })

  // A price left at Paddle's default maximum of 100 cannot sell more than the catalogue offers.
  it('clamps a pack quantity to the catalogue maximum', () => {
    const snapshot = subscriptionToSnapshot(subscription({ items: [item('pri_services', 40)] }), CATALOGUE, NOW)
    expect(snapshot?.addons).toEqual([{ addon: 'extraServices', quantity: 10 }])
  })

  it('logs and ignores an item it does not sell, and an inactive one', () => {
    const snapshot = subscriptionToSnapshot(
      subscription({ items: [item('pri_basic'), item('pri_other'), item('pri_calendar', 1, 'inactive')] }),
      CATALOGUE,
      NOW
    )
    expect(snapshot?.addons).toEqual([])
    expect(snapshot?.unknownPriceIds).toEqual(['pri_other'])
  })

  // A voluntary cancellation ends exactly when it takes effect — no grace on top.
  it('ends a plan with a scheduled cancellation exactly when it takes effect', () => {
    const effectiveAt = new Date('2026-11-01T00:00:00.000Z')
    const snapshot = subscriptionToSnapshot(
      subscription({ items: [item('pri_standard'), item('pri_slug')], scheduledChange: { action: 'cancel', effectiveAt } }),
      CATALOGUE,
      NOW
    )
    expect(snapshot?.fields.planExpiresAt).toEqual(effectiveAt)
    expect(snapshot?.fields.billingCancelsAt).toEqual(effectiveAt)
    expect(snapshot?.addonsExpiresAt).toEqual(effectiveAt)
  })

  it('keeps a past-due plan for the dunning grace, counted from the unpaid period', () => {
    const snapshot = subscriptionToSnapshot(subscription({ status: 'past_due' }), CATALOGUE, NOW)
    expect(snapshot?.fields.plan).toBe('standard')
    expect(snapshot?.fields.planExpiresAt).toEqual(plusDays('2026-10-01T00:00:00.000Z', PAST_DUE_GRACE_DAYS))
  })

  it.each(['paused', 'canceled'] as const)('drops a %s subscription to free with no add-ons', (status) => {
    const snapshot = subscriptionToSnapshot(subscription({ status, items: [item('pri_basic'), item('pri_slug')] }), CATALOGUE, NOW)
    expect(snapshot).toMatchObject({
      fields: { plan: 'free', planExpiresAt: null, billingStatus: status },
      addons: [],
      addonsExpiresAt: null,
    })
  })

  it('grants nothing when not one item is sold here', () => {
    expect(subscriptionToSnapshot(subscription({ items: [item('pri_other')] }), CATALOGUE, NOW)).toBeNull()
    expect(subscriptionToSnapshot(subscription({ items: [] }), CATALOGUE, NOW)).toBeNull()
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

describe('itemsForPlan', () => {
  const line = (priceId: string, quantity = 1) => ({ priceId, quantity })

  // Nobody pays twice: Basic includes the custom link, so the add-on goes with the switch.
  it('drops the add-ons the new plan includes, and keeps the rest', () => {
    const result = itemsForPlan([line('pri_slug'), line('pri_services', 2)], 'basic', CATALOGUE)
    expect(result).toEqual({ items: [line('pri_basic'), line('pri_services', 2)], dropped: ['customSlug'] })
  })

  it('replaces the plan item when switching between plans', () => {
    const result = itemsForPlan([line('pri_basic'), line('pri_services', 2)], 'premium', CATALOGUE)
    // Premium has no service cap, so the pack is dropped too.
    expect(result).toEqual({ items: [line('pri_premium')], dropped: ['extraServices'] })
  })

  it('removes the plan item for free and keeps every add-on', () => {
    expect(itemsForPlan([line('pri_basic'), line('pri_services')], 'free', CATALOGUE)).toEqual({
      items: [line('pri_services')],
      dropped: [],
    })
  })

  // Free with nothing else left is a cancellation — the caller refuses it.
  it('can leave nothing at all, which the caller turns into lastItem', () => {
    expect(itemsForPlan([line('pri_basic')], 'free', CATALOGUE).items).toEqual([])
  })

  it('passes an unknown item through, and keeps the held plan on its own price', () => {
    const result = itemsForPlan([line('pri_mystery'), line('pri_basic')], 'basic', CATALOGUE)
    expect(result.items).toEqual([line('pri_basic'), line('pri_mystery')])
  })
})

describe('itemsForAddon', () => {
  const line = (priceId: string, quantity = 1) => ({ priceId, quantity })

  it('adds an add-on at the price sold now', () => {
    expect(itemsForAddon([line('pri_basic')], 'extraServices', 2, CATALOGUE)).toEqual([line('pri_basic'), line('pri_services', 2)])
  })

  // A subscriber on a retired price stays on it when only the quantity changes.
  it('changes a quantity in place, keeping an old price', () => {
    expect(itemsForAddon([line('pri_slug_old'), line('pri_basic')], 'customSlug', 1, CATALOGUE)).toEqual([
      line('pri_slug_old'),
      line('pri_basic'),
    ])
    expect(itemsForAddon([line('pri_services', 2)], 'extraServices', 5, CATALOGUE)).toEqual([line('pri_services', 5)])
  })

  it('removes it at zero, collapsing duplicates, and touches nothing else', () => {
    expect(itemsForAddon([line('pri_services'), line('pri_mystery'), line('pri_services')], 'extraServices', 0, CATALOGUE)).toEqual([
      line('pri_mystery'),
    ])
  })
})

describe('planOfLines and addonQuantityOf', () => {
  const lines = [
    { priceId: 'pri_basic', quantity: 1 },
    { priceId: 'pri_services', quantity: 2 },
    { priceId: 'pri_services', quantity: 1 },
  ]

  it('read what a subscription holds', () => {
    expect(planOfLines(lines, CATALOGUE)).toBe('basic')
    expect(planOfLines(lines.slice(1), CATALOGUE)).toBe('free')
    expect(addonQuantityOf(lines, 'extraServices', CATALOGUE)).toBe(3)
    expect(addonQuantityOf(lines, 'customSlug', CATALOGUE)).toBe(0)
  })
})

describe('parseCart', () => {
  it('reads a plan, add-ons, or both', () => {
    expect(parseCart({ plan: 'basic' })).toEqual({ plan: 'basic', addons: [] })
    expect(parseCart({ addons: [{ addon: 'customSlug' }] })).toEqual({ plan: null, addons: [{ addon: 'customSlug', quantity: 1 }] })
    expect(parseCart({ plan: 'basic', addons: [{ addon: 'extraServices', quantity: 2 }] }).addons).toHaveLength(1)
  })

  it('refuses an empty cart, free, and an unknown plan', () => {
    expect(() => parseCart({})).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseCart({ plan: 'free' })).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseCart({ plan: 'gold' })).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('becomes Paddle items at the prices sold now', () => {
    const cart = parseCart({ plan: 'basic', addons: [{ addon: 'customSlug' }, { addon: 'extraServices', quantity: 2 }] })
    expect(cartLines(cart, CATALOGUE)).toEqual([
      { priceId: 'pri_basic', quantity: 1 },
      { priceId: 'pri_slug', quantity: 1 },
      { priceId: 'pri_services', quantity: 2 },
    ])
  })

  it('names the add-ons a plan already includes', () => {
    expect(includedAddons('basic', [{ addon: 'customSlug', quantity: 1 }, { addon: 'extraServices', quantity: 1 }])).toEqual([
      'customSlug',
    ])
    expect(includedAddons('free', [{ addon: 'customSlug', quantity: 1 }])).toEqual([])
  })
})

describe('isChangeUnavailableCode', () => {
  it('recognises the "not right now" refusals and nothing else', () => {
    expect(isChangeUnavailableCode('subscription_locked_renewal')).toBe(true)
    expect(isChangeUnavailableCode('subscription_locked_pending_changes')).toBe(true)
    expect(isChangeUnavailableCode('subscription_update_when_past_due')).toBe(true)
    expect(isChangeUnavailableCode('subscription_immediate_charge_hour_limit_exceeded')).toBe(true)
    expect(isChangeUnavailableCode('invalid_field')).toBe(false)
    expect(isChangeUnavailableCode(undefined)).toBe(false)
  })
})

describe('createKeyedLock', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5))

  // Two changes to one subscription must not interleave their read and their write.
  it('runs calls with the same key one after another, in order', async () => {
    const lock = createKeyedLock()
    const log: string[] = []
    const task = (name: string) => async () => {
      log.push(`${name} start`)
      await tick()
      log.push(`${name} end`)
      return name
    }

    const results = await Promise.all([lock('p1', task('a')), lock('p1', task('b'))])
    expect(results).toEqual(['a', 'b'])
    expect(log).toEqual(['a start', 'a end', 'b start', 'b end'])
  })

  it('lets different keys run together, and a failure free the next caller', async () => {
    const lock = createKeyedLock()
    const log: string[] = []
    const slow = lock('p1', async () => {
      await tick()
      log.push('p1')
    })
    await lock('p2', async () => {
      log.push('p2')
    })
    await slow
    expect(log).toEqual(['p2', 'p1'])

    await expect(lock('p3', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await expect(lock('p3', async () => 'after')).resolves.toBe('after')
  })
})
