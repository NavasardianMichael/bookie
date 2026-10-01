import { describe, expect, it } from 'vitest'
// Relative, not aliased: `server/` is a separate package. `plans.ts` takes `now` everywhere
// and touches no Prisma client, which is what keeps every limit reachable here.
import {
  assertServiceSlot,
  assertSlugChange,
  bookingPeriod,
  bookingsThisMonthWhere,
  capNoticesDue,
  capWarningThreshold,
  effectivePlan,
  type Entitlements,
  getEntitlements,
  hasRoomFor,
  needsCustomSlug,
  parseAdminPlanBody,
  PLAN_CATALOGUE,
  PLAN_ORDER,
  takesServiceSlot,
} from '../../../server/src/services/plans'

const NOW = new Date('2026-09-30T12:00:00.000Z')
const LATER = new Date('2026-10-15T00:00:00.000Z')
const EARLIER = new Date('2026-09-01T00:00:00.000Z')

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
    expect(getEntitlements({ plan: 'basic', planExpiresAt: EARLIER }, NOW)).toBe(PLAN_CATALOGUE.free)
    expect(getEntitlements({ plan: 'basic', planExpiresAt: null }, NOW)).toBe(PLAN_CATALOGUE.basic)
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
