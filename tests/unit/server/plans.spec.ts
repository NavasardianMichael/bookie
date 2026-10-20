import { describe, expect, it } from 'vitest'
// Relative, not aliased: `server/` is a separate package. `plans.ts` takes `now` everywhere
// and touches no Prisma client, which is what keeps every limit reachable here.
import {
  ADDON_CATALOGUE,
  ADDON_ORDER,
  ADDON_PRICES,
  type AddonGrant,
  addonsMonthlyCents,
  assertServiceSlot,
  assertSlugChange,
  betterPlanFor,
  bookingPeriod,
  bookingsThisMonthWhere,
  capNoticesDue,
  capWarningThreshold,
  effectivePlan,
  type Entitlements,
  getEntitlements,
  hasRoomFor,
  heldAddons,
  isAddonIncluded,
  maxAddonQuantity,
  needsCustomSlug,
  PAID_PLANS,
  parseAddonLines,
  parseAdminAddonsBody,
  parseAdminPlanBody,
  PLAN_CATALOGUE,
  PLAN_ORDER,
  PLAN_PRICES,
  planChangeStampReset,
  plansIncluding,
  takesServiceSlot,
} from '../../../server/src/services/plans'

const NOW = new Date('2026-09-30T12:00:00.000Z')
const LATER = new Date('2026-10-15T00:00:00.000Z')
const EARLIER = new Date('2026-09-01T00:00:00.000Z')

/** A live (or, with `expiresAt`, lapsing) add-on row. */
const grant = (overrides: Partial<AddonGrant> & Pick<AddonGrant, 'addon'>): AddonGrant => ({
  source: 'paddle',
  quantity: 1,
  expiresAt: null,
  ...overrides,
})

/** `null` is unlimited, so it ranks above every number. */
const rank = (value: number | boolean | null): number =>
  value === null ? Number.POSITIVE_INFINITY : typeof value === 'boolean' ? Number(value) : value

describe('PLAN_CATALOGUE', () => {
  it('has an entry for every plan, and no other', () => {
    expect(Object.keys(PLAN_CATALOGUE).sort()).toEqual([...PLAN_ORDER].sort())
  })

  // An upgrade that takes something away is a bug in the catalogue, not a pricing choice.
  it.each(Object.keys(PLAN_CATALOGUE.free) as (keyof Entitlements)[])(
    'never lowers %s from one plan to the next',
    (key) => {
      PLAN_ORDER.slice(1).forEach((plan, index) => {
        const cheaper = PLAN_CATALOGUE[PLAN_ORDER[index]][key]
        expect(rank(PLAN_CATALOGUE[plan][key])).toBeGreaterThanOrEqual(rank(cheaper))
      })
    }
  )

  it('keeps the custom link off the free plan', () => {
    expect(PLAN_CATALOGUE.free.customSlug).toBe(false)
  })
})

describe('effectivePlan', () => {
  it('is the stored plan when it has no end', () => {
    expect(effectivePlan({ plan: 'basic', planExpiresAt: null }, NOW)).toBe('basic')
  })

  it('is the stored plan until its expiry', () => {
    expect(effectivePlan({ plan: 'standard', planExpiresAt: LATER }, NOW)).toBe('standard')
  })

  it('falls back to free once the expiry has passed', () => {
    expect(effectivePlan({ plan: 'premium', planExpiresAt: EARLIER }, NOW)).toBe('free')
  })

  // The boundary is exclusive of the plan: at the stated instant it has ended.
  it('has ended at the exact expiry instant', () => {
    expect(effectivePlan({ plan: 'basic', planExpiresAt: NOW }, NOW)).toBe('free')
  })

  it('stays free whatever expiry a free row carries', () => {
    expect(effectivePlan({ plan: 'free', planExpiresAt: LATER }, NOW)).toBe('free')
  })

  it('feeds getEntitlements', () => {
    expect(getEntitlements({ plan: 'basic', planExpiresAt: EARLIER, addons: [] }, NOW)).toBe(PLAN_CATALOGUE.free)
    expect(getEntitlements({ plan: 'basic', planExpiresAt: null, addons: [] }, NOW)).toBe(PLAN_CATALOGUE.basic)
  })
})

describe('ADDON_CATALOGUE', () => {
  it('has an entry, a price and a maximum for every add-on, and no other', () => {
    expect(Object.keys(ADDON_CATALOGUE).sort()).toEqual([...ADDON_ORDER].sort())
    expect(Object.keys(ADDON_PRICES).sort()).toEqual([...ADDON_ORDER].sort())
    ADDON_ORDER.forEach((addon) => {
      expect(ADDON_PRICES[addon].amountCents).toBeGreaterThan(0)
      expect(maxAddonQuantity(addon)).toBeGreaterThanOrEqual(1)
    })
  })

  // An add-on Free already has would sell nothing to anyone.
  it('sells only what Free lacks', () => {
    ADDON_ORDER.forEach((addon) => expect(isAddonIncluded('free', addon)).toBe(false))
  })

  it('names each feature add-on after the entitlement it grants', () => {
    ADDON_ORDER.forEach((addon) => {
      const spec = ADDON_CATALOGUE[addon]
      if (spec.kind === 'feature') expect(spec.grants).toBe(addon)
    })
  })

  // The plans are the bundles. If rebuilding one from Free out of add-ons were cheaper, the
  // plan would be the worse deal — a pricing typo, not a choice. Only what add-ons can reach
  // is rebuilt: an unlimited limit no pack reaches makes the plan cheaper by definition.
  it.each(PAID_PLANS)('prices %s below the add-ons it would take to rebuild it from Free', (plan) => {
    const target = PLAN_CATALOGUE[plan]
    const free = PLAN_CATALOGUE.free
    let cents = 0
    let reachable = true

    ADDON_ORDER.forEach((addon) => {
      const spec = ADDON_CATALOGUE[addon]
      if (spec.kind === 'feature') {
        if (target[spec.grants]) cents += ADDON_PRICES[addon].amountCents
        return
      }
      const wanted = target[spec.limit]
      const base = free[spec.limit] ?? 0
      if (wanted === null) {
        reachable = false
        return
      }
      const packs = Math.ceil(Math.max(0, wanted - base) / spec.step)
      if (packs > spec.maxQuantity) reachable = false
      cents += packs * ADDON_PRICES[addon].amountCents
    })

    if (reachable) expect(PLAN_PRICES[plan].amountCents).toBeLessThan(cents)
  })
})

describe('add-on entitlements', () => {
  const free = { plan: 'free' as const, planExpiresAt: null }

  it('turns a feature on, on top of the plan', () => {
    const entitlements = getEntitlements({ ...free, addons: [grant({ addon: 'customSlug' })] }, NOW)
    expect(entitlements.customSlug).toBe(true)
    expect(entitlements.calendarFeed).toBe(false)
  })

  it('adds a step per pack to the limit', () => {
    const entitlements = getEntitlements(
      { ...free, addons: [grant({ addon: 'extraServices', quantity: 2 }), grant({ addon: 'extraBookings', quantity: 3 })] },
      NOW
    )
    expect(entitlements.maxActiveServices).toBe(3 + 2 * 5)
    expect(entitlements.maxBookingsPerMonth).toBe(50 + 3 * 100)
  })

  it('leaves an unlimited limit unlimited', () => {
    const entitlements = getEntitlements(
      { plan: 'premium', planExpiresAt: null, addons: [grant({ addon: 'extraServices', quantity: 2 })] },
      NOW
    )
    expect(entitlements.maxActiveServices).toBeNull()
  })

  // Shared catalogue entries are read by every request; a merge must copy, never write.
  it('never mutates the shared catalogue', () => {
    getEntitlements({ ...free, addons: [grant({ addon: 'customSlug' }), grant({ addon: 'extraServices' })] }, NOW)
    expect(PLAN_CATALOGUE.free).toMatchObject({ customSlug: false, maxActiveServices: 3 })
  })

  it('stops granting at the expiry instant, like a plan', () => {
    const addons = [grant({ addon: 'customSlug', expiresAt: NOW })]
    expect(getEntitlements({ ...free, addons }, NOW)).toBe(PLAN_CATALOGUE.free)
    expect(getEntitlements({ ...free, addons }, EARLIER).customSlug).toBe(true)
  })

  // A lapsed plan with a live add-on keeps the add-on: they were bought separately.
  it('outlives a lapsed plan', () => {
    const entitlements = getEntitlements({ plan: 'basic', planExpiresAt: EARLIER, addons: [grant({ addon: 'calendarFeed' })] }, NOW)
    expect(entitlements.calendarFeed).toBe(true)
    expect(entitlements.maxActiveServices).toBe(PLAN_CATALOGUE.free.maxActiveServices)
  })

  it('merges both sources: a feature twice is one, packs add up to the maximum', () => {
    const held = heldAddons(
      [
        grant({ addon: 'customSlug' }),
        grant({ addon: 'customSlug', source: 'admin' }),
        grant({ addon: 'extraBookings', quantity: 8 }),
        grant({ addon: 'extraBookings', source: 'admin', quantity: 8 }),
      ],
      NOW
    )
    expect(held.get('customSlug')).toBe(1)
    expect(held.get('extraBookings')).toBe(maxAddonQuantity('extraBookings'))
  })

  it('narrows to one source — what is paid for is the paddle rows alone', () => {
    const held = heldAddons([grant({ addon: 'customSlug', source: 'admin' }), grant({ addon: 'calendarFeed' })], NOW, 'paddle')
    expect([...held.keys()]).toEqual(['calendarFeed'])
  })
})

describe('isAddonIncluded', () => {
  it('is true where the plan has the feature or no limit to raise', () => {
    expect(isAddonIncluded('basic', 'customSlug')).toBe(true)
    expect(isAddonIncluded('basic', 'extraServices')).toBe(false)
    expect(isAddonIncluded('standard', 'extraBookings')).toBe(true)
    expect(isAddonIncluded('premium', 'extraServices')).toBe(true)
  })

  it('lists every plan that includes an add-on, in order', () => {
    expect(plansIncluding('customSlug')).toEqual(['basic', 'standard', 'premium'])
    expect(plansIncluding('extraServices')).toEqual(['premium'])
  })
})

describe('betterPlanFor', () => {
  const held = (entries: [AddonGrant['addon'], number][]) => new Map(entries)

  it('suggests Basic once the features bought cost more than it', () => {
    const three = held([
      ['customSlug', 1],
      ['telegramNotifications', 1],
      ['calendarFeed', 1],
    ])
    expect(addonsMonthlyCents(three)).toBeGreaterThan(PLAN_PRICES.basic.amountCents)
    expect(betterPlanFor('free', three)).toBe('basic')
  })

  it('suggests nothing while the add-ons are the cheaper way', () => {
    expect(betterPlanFor('free', held([['customSlug', 1]]))).toBeNull()
    expect(betterPlanFor('free', new Map())).toBeNull()
  })

  // Basic keeps packs it does not include, so they count towards its cost too.
  it('prices a switch the way it would leave the provider, packs and all', () => {
    expect(betterPlanFor('basic', held([['extraBookings', 10]]))).toBe('standard')
  })

  it('never suggests the plan already held, or a smaller one', () => {
    expect(betterPlanFor('premium', held([['extraServices', 10]]))).toBeNull()
  })
})

describe('parseAddonLines', () => {
  it('reads lines, defaulting a quantity of one', () => {
    expect(parseAddonLines([{ addon: 'customSlug' }, { addon: 'extraServices', quantity: 3 }])).toEqual([
      { addon: 'customSlug', quantity: 1 },
      { addon: 'extraServices', quantity: 3 },
    ])
    expect(parseAddonLines(undefined)).toEqual([])
  })

  it('refuses an unknown add-on, a duplicate, and a quantity out of range', () => {
    expect(() => parseAddonLines([{ addon: 'gold' }])).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseAddonLines([{ addon: 'customSlug' }, { addon: 'customSlug' }])).toThrow(
      expect.objectContaining({ status: 400 })
    )
    expect(() => parseAddonLines([{ addon: 'customSlug', quantity: 2 }])).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseAddonLines([{ addon: 'extraServices', quantity: 0 }])).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseAddonLines([{ addon: 'extraServices', quantity: 1.5 }])).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseAddonLines('customSlug')).toThrow(expect.objectContaining({ status: 400 }))
  })
})

describe('parseAdminAddonsBody', () => {
  it('reads a grant with a future end, or none', () => {
    expect(parseAdminAddonsBody({ addons: [{ addon: 'customSlug' }], expiresAt: LATER.toISOString() }, NOW)).toEqual({
      addons: [{ addon: 'customSlug', quantity: 1 }],
      expiresAt: LATER,
    })
    expect(parseAdminAddonsBody({ addons: [{ addon: 'customSlug' }] }, NOW).expiresAt).toBeNull()
  })

  // An empty grant withdraws it; an end on nothing is meaningless.
  it('withdraws with an empty list, and drops its end', () => {
    expect(parseAdminAddonsBody({ addons: [], expiresAt: LATER.toISOString() }, NOW)).toEqual({ addons: [], expiresAt: null })
  })

  it('refuses a missing list and a past end', () => {
    expect(() => parseAdminAddonsBody({}, NOW)).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseAdminAddonsBody({ addons: [{ addon: 'customSlug' }], expiresAt: EARLIER.toISOString() }, NOW)).toThrow(
      expect.objectContaining({ status: 400 })
    )
  })
})

describe('hasRoomFor', () => {
  it('leaves room below the limit and none at it', () => {
    expect(hasRoomFor(2, 3)).toBe(true)
    expect(hasRoomFor(3, 3)).toBe(false)
    expect(hasRoomFor(4, 3)).toBe(false)
  })

  it('always has room when unlimited', () => {
    expect(hasRoomFor(10_000, null)).toBe(true)
  })
})

describe('bookingPeriod', () => {
  it('is the UTC calendar month, end exclusive', () => {
    expect(bookingPeriod(NOW)).toEqual({
      start: new Date('2026-09-01T00:00:00.000Z'),
      end: new Date('2026-10-01T00:00:00.000Z'),
    })
  })

  it('rolls December into January of the next year', () => {
    expect(bookingPeriod(new Date('2026-12-31T23:59:59.999Z'))).toEqual({
      start: new Date('2026-12-01T00:00:00.000Z'),
      end: new Date('2027-01-01T00:00:00.000Z'),
    })
  })

  it('puts the first instant of a month in that month', () => {
    expect(bookingPeriod(new Date('2026-10-01T00:00:00.000Z')).start).toEqual(new Date('2026-10-01T00:00:00.000Z'))
  })
})

describe('bookingsThisMonthWhere', () => {
  const where = bookingsThisMonthWhere('p1', NOW)

  // A client cancelling, or the provider declining, must not cost the provider a booking.
  it('does not count cancelled bookings', () => {
    expect(where.status).toEqual({ not: 'cancelled' })
  })

  it('counts by creation time within the month, one provider only', () => {
    expect(where).toMatchObject({
      providerId: 'p1',
      createdAt: { gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-10-01T00:00:00.000Z') },
    })
  })
})

describe('service slots', () => {
  it('takes a slot only when a service goes from inactive to active', () => {
    expect(takesServiceSlot(false, true)).toBe(true)
    expect(takesServiceSlot(true, true)).toBe(false)
    expect(takesServiceSlot(true, false)).toBe(false)
    expect(takesServiceSlot(false, false)).toBe(false)
  })

  it('refuses the slot past the plan limit with the stable code', () => {
    expect(() => assertServiceSlot(2, PLAN_CATALOGUE.free)).not.toThrow()
    expect(() => assertServiceSlot(3, PLAN_CATALOGUE.free)).toThrow(
      expect.objectContaining({ status: 403, code: 4101 })
    )
    expect(() => assertServiceSlot(500, PLAN_CATALOGUE.premium)).not.toThrow()
  })
})

describe('slug changes', () => {
  // The SEO tab resends the slug with every save; a grandfathered one must survive that.
  it('lets an unchanged slug through on any plan', () => {
    expect(needsCustomSlug('acme-hair', 'acme-hair')).toBe(false)
    expect(needsCustomSlug(null, null)).toBe(false)
    expect(() => assertSlugChange('acme-hair', 'acme-hair', PLAN_CATALOGUE.free)).not.toThrow()
  })

  it('always allows giving a slug up', () => {
    expect(needsCustomSlug('acme-hair', null)).toBe(false)
  })

  it('needs the feature to set or change one', () => {
    expect(needsCustomSlug(null, 'acme-hair')).toBe(true)
    expect(needsCustomSlug('acme-hair', 'acme-salon')).toBe(true)
    expect(() => assertSlugChange(null, 'acme-hair', PLAN_CATALOGUE.free)).toThrow(
      expect.objectContaining({ status: 403, code: 4102 })
    )
    expect(() => assertSlugChange(null, 'acme-hair', PLAN_CATALOGUE.basic)).not.toThrow()
  })
})

describe('capNoticesDue', () => {
  const periodStart = new Date('2026-09-01T00:00:00.000Z')
  const lastMonth = new Date('2026-08-20T00:00:00.000Z')
  const thisMonth = new Date('2026-09-10T00:00:00.000Z')
  const due = (used: number, limit: number | null, warnedAt: Date | null = null, reachedAt: Date | null = null) =>
    capNoticesDue({ used, limit, warnedAt, reachedAt, periodStart })

  it('warns at 80%, rounded up', () => {
    expect(capWarningThreshold(50)).toBe(40)
    expect(capWarningThreshold(3)).toBe(3)
    expect(due(39, 50)).toEqual([])
    expect(due(40, 50)).toEqual(['warned'])
  })

  it('announces the limit once it is reached — and only that, never both at once', () => {
    expect(due(50, 50)).toEqual(['reached'])
    expect(due(1, 1)).toEqual(['reached'])
  })

  it('sends each at most once a month', () => {
    expect(due(41, 50, thisMonth)).toEqual([])
    expect(due(50, 50, thisMonth, thisMonth)).toEqual([])
  })

  it('sends again in a new month', () => {
    expect(due(40, 50, lastMonth)).toEqual(['warned'])
    expect(due(50, 50, lastMonth, lastMonth)).toEqual(['reached'])
  })

  it('never sends for an unlimited plan', () => {
    expect(due(10_000, null)).toEqual([])
  })
})

describe('parseAdminPlanBody', () => {
  it('reads a plan with no end', () => {
    expect(parseAdminPlanBody({ plan: 'basic' }, NOW)).toEqual({ plan: 'basic', planExpiresAt: null })
    expect(parseAdminPlanBody({ plan: 'basic', planExpiresAt: null }, NOW)).toEqual({
      plan: 'basic',
      planExpiresAt: null,
    })
  })

  it('reads a future expiry', () => {
    expect(parseAdminPlanBody({ plan: 'standard', planExpiresAt: LATER.toISOString() }, NOW)).toEqual({
      plan: 'standard',
      planExpiresAt: LATER,
    })
  })

  it('drops an expiry on free, which has nothing to lapse from', () => {
    expect(parseAdminPlanBody({ plan: 'free', planExpiresAt: LATER.toISOString() }, NOW)).toEqual({
      plan: 'free',
      planExpiresAt: null,
    })
  })

  it('refuses an unknown plan, a malformed expiry and a past one', () => {
    expect(() => parseAdminPlanBody({ plan: 'gold' }, NOW)).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseAdminPlanBody({}, NOW)).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseAdminPlanBody({ plan: 'basic', planExpiresAt: 'soon' }, NOW)).toThrow(
      expect.objectContaining({ status: 400 })
    )
    expect(() => parseAdminPlanBody({ plan: 'basic', planExpiresAt: EARLIER.toISOString() }, NOW)).toThrow(
      expect.objectContaining({ status: 400 })
    )
    expect(() => parseAdminPlanBody({ plan: 'basic', planExpiresAt: 12 }, NOW)).toThrow(
      expect.objectContaining({ status: 400 })
    )
  })
})

describe('PLAN_PRICES', () => {
  it('prices every plan, Free at nothing', () => {
    expect(Object.keys(PLAN_PRICES).sort()).toEqual([...PLAN_ORDER].sort())
    expect(PLAN_PRICES.free.amountCents).toBe(0)
  })

  // A bigger plan that costs less than a smaller one is a typo, not a pricing choice.
  it('rises strictly from one plan to the next', () => {
    PLAN_ORDER.slice(1).forEach((plan, index) => {
      expect(PLAN_PRICES[plan].amountCents).toBeGreaterThan(PLAN_PRICES[PLAN_ORDER[index]].amountCents)
    })
  })

  // Paid plans sell convenience, never the basics: the paid-only features start at Basic.
  it('keeps Telegram, the calendar feed and unbranded pages off Free and on every paid plan', () => {
    expect(PLAN_CATALOGUE.free).toMatchObject({ telegramNotifications: false, calendarFeed: false, removeBranding: false })
    PLAN_ORDER.slice(1).forEach((plan) =>
      expect(PLAN_CATALOGUE[plan]).toMatchObject({ telegramNotifications: true, calendarFeed: true, removeBranding: true })
    )
  })
})

describe('planChangeStampReset', () => {
  it('clears the allowance-notice stamps when the effective plan changes', () => {
    expect(
      planChangeStampReset({ plan: 'free', planExpiresAt: null, addons: [] }, { plan: 'basic', planExpiresAt: LATER, addons: [] }, NOW)
    ).toEqual({
      bookingCapWarnedAt: null,
      bookingCapReachedAt: null,
    })
  })

  // Re-saving the same plan must not let this month's notices go out twice.
  it('clears nothing when the effective plan stays the same', () => {
    expect(
      planChangeStampReset({ plan: 'basic', planExpiresAt: LATER, addons: [] }, { plan: 'basic', planExpiresAt: null, addons: [] }, NOW)
    ).toEqual({})
  })

  // A booking pack raises the allowance with no plan change at all.
  it('clears them when a pack changes the allowance, and not for a feature', () => {
    const before = { plan: 'free' as const, planExpiresAt: null, addons: [] }
    expect(planChangeStampReset(before, { ...before, addons: [grant({ addon: 'extraBookings' })] }, NOW)).toEqual({
      bookingCapWarnedAt: null,
      bookingCapReachedAt: null,
    })
    expect(planChangeStampReset(before, { ...before, addons: [grant({ addon: 'customSlug' })] }, NOW)).toEqual({})
  })
})
