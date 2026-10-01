import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { hasRoomFor, toPlanExpiryISO, toPlanLastDay, toPlanLastDayValue, usagePercent } from '@helpers/plans'

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
