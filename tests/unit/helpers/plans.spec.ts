import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { ProviderPlanWithUsage } from '@interfaces/plans'
import {
  hasRoomFor,
  heldQuantity,
  isBillingTargetReached,
  toPlanExpiryISO,
  toPlanLastDay,
  toPlanLastDayValue,
  usagePercent,
} from '@helpers/plans'

describe('plan expiry', () => {
  // People pick the last day a plan covers; the plan ends at the UTC midnight after it.
  it('ends the plan at the UTC midnight after the picked last day', () => {
    expect(toPlanExpiryISO(dayjs(new Date(2026, 9, 31)))).toBe('2026-11-01T00:00:00.000Z')
  })

  it('rolls the last day of the year into the next', () => {
    expect(toPlanExpiryISO(dayjs(new Date(2026, 11, 31)))).toBe('2027-01-01T00:00:00.000Z')
  })

  it('reads the expiry back as the same last day', () => {
    const lastDay = toPlanLastDay('2026-11-01T00:00:00.000Z')
    expect([lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()]).toEqual([2026, 9, 31])
    expect(toPlanLastDayValue('2026-11-01T00:00:00.000Z').format('YYYY-MM-DD')).toBe('2026-10-31')
  })

  it('round-trips through the picker', () => {
    const picked = dayjs(new Date(2027, 2, 15))
    expect(toPlanLastDayValue(toPlanExpiryISO(picked)).format('YYYY-MM-DD')).toBe('2027-03-15')
  })
})

describe('usagePercent', () => {
  it('is the share of the limit used, rounded', () => {
    expect(usagePercent(1, 3)).toBe(33)
    expect(usagePercent(40, 50)).toBe(80)
  })

  // A downgraded provider can sit above their new limit; the bar must not overflow.
  it('caps at 100', () => {
    expect(usagePercent(12, 10)).toBe(100)
  })

  it('has nothing to draw against an unlimited plan', () => {
    expect(usagePercent(500, null)).toBeNull()
  })
})

describe('hasRoomFor', () => {
  it('has room below the limit, none at it, and always when unlimited', () => {
    expect(hasRoomFor(2, 3)).toBe(true)
    expect(hasRoomFor(3, 3)).toBe(false)
    expect(hasRoomFor(99, null)).toBe(true)
  })
})

const held: ProviderPlanWithUsage['addons'] = [
  { addon: 'extraServices', quantity: 2, source: 'paddle' },
  { addon: 'extraServices', quantity: 1, source: 'admin' },
  { addon: 'customSlug', quantity: 1, source: 'admin' },
]

describe('heldQuantity', () => {
  it('adds both sources up, or counts one', () => {
    expect(heldQuantity(held, 'extraServices')).toBe(3)
    expect(heldQuantity(held, 'extraServices', 'paddle')).toBe(2)
    expect(heldQuantity(held, 'customSlug', 'paddle')).toBe(0)
    expect(heldQuantity(held, 'calendarFeed')).toBe(0)
  })
})

describe('isBillingTargetReached', () => {
  const current = (overrides: Partial<ProviderPlanWithUsage> = {}): ProviderPlanWithUsage =>
    ({ plan: 'basic', effectivePlan: 'basic', addons: held, billing: null, ...overrides }) as ProviderPlanWithUsage

  it('waits for the plan asked for to be the one in force', () => {
    expect(isBillingTargetReached({ kind: 'plan', plan: 'basic' }, current())).toBe(true)
    expect(isBillingTargetReached({ kind: 'plan', plan: 'standard' }, current())).toBe(false)
  })

  // Only what is paid for counts: an admin's grant is not what an add-on change moved.
  it('waits for exactly the paid quantity of an add-on, none included', () => {
    expect(isBillingTargetReached({ kind: 'addon', addon: 'extraServices', quantity: 2 }, current())).toBe(true)
    expect(isBillingTargetReached({ kind: 'addon', addon: 'extraServices', quantity: 3 }, current())).toBe(false)
    expect(isBillingTargetReached({ kind: 'addon', addon: 'customSlug', quantity: 0 }, current())).toBe(true)
  })

  it('after a checkout, waits for any live subscription', () => {
    expect(isBillingTargetReached({ kind: 'subscribed' }, current())).toBe(false)
    expect(isBillingTargetReached({ kind: 'subscribed' }, current({ billing: { status: 'canceled', manageable: true } }))).toBe(
      false
    )
    expect(isBillingTargetReached({ kind: 'subscribed' }, current({ billing: { status: 'active', manageable: true } }))).toBe(true)
  })
})
