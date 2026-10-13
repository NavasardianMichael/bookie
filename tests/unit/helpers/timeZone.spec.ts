import { describe, expect, it } from 'vitest'
import {
  calendarDayOf,
  dayKeyOf,
  fixedOffsetZone,
  formatTimeZoneName,
  formatUtcOffset,
  inTimeZone,
  isSameWallClock,
  isTimeZone,
  listTimeZones,
  UTC_OFFSET_HOURS,
  weekdayInSameWeek,
  wholeOffsetHours,
  zonedTimeToDate,
  zoneOffsetMs,
} from '@helpers/timeZone'

/**
 * TZ is pinned to UTC (`vitest.config.mts`), so every answer here that is not UTC came from
 * the zone argument — which is the whole point of the module.
 */
const HOUR = 60 * 60 * 1000

describe('isTimeZone', () => {
  it('accepts what Intl can format in, and nothing else', () => {
    expect(isTimeZone('Asia/Yerevan')).toBe(true)
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('Mars/Olympus')).toBe(false)
    expect(isTimeZone('')).toBe(false)
    expect(isTimeZone(undefined)).toBe(false)
  })
})

describe('zoneOffsetMs', () => {
  it('is positive east of Greenwich and follows DST', () => {
    expect(zoneOffsetMs(new Date('2026-03-02T12:00:00Z'), 'Asia/Yerevan')).toBe(4 * HOUR)
    expect(zoneOffsetMs(new Date('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-5 * HOUR)
    expect(zoneOffsetMs(new Date('2026-07-15T12:00:00Z'), 'America/New_York')).toBe(-4 * HOUR)
  })
})

describe('zonedTimeToDate', () => {
  it('is the instant the zone shows that wall time', () => {
    expect(zonedTimeToDate('2026-03-02', 9 * 60, 'Asia/Yerevan').toISOString()).toBe('2026-03-02T05:00:00.000Z')
  })

  // Measured twice: the guess for 09:00 on spring-forward day sits before the change.
  it('lands on the right side of a DST change', () => {
    expect(zonedTimeToDate('2026-03-08', 9 * 60, 'America/New_York').toISOString()).toBe('2026-03-08T13:00:00.000Z')
    expect(zonedTimeToDate('2026-03-07', 9 * 60, 'America/New_York').toISOString()).toBe('2026-03-07T14:00:00.000Z')
  })

  it('carries minutes past 24:00 into the next day rather than wrapping', () => {
    expect(zonedTimeToDate('2026-03-02', 24 * 60 + 30, 'UTC').toISOString()).toBe('2026-03-03T00:30:00.000Z')
  })
})

describe('inTimeZone / dayKeyOf / calendarDayOf', () => {
  const lateMonday = '2026-03-02T21:30:00.000Z' // 01:30 Tuesday in Yerevan

  it("formats an instant on the zone's clock", () => {
    expect(inTimeZone(lateMonday, 'Asia/Yerevan').format('YYYY-MM-DD HH:mm')).toBe('2026-03-03 01:30')
    expect(inTimeZone(lateMonday).format('YYYY-MM-DD HH:mm')).toBe('2026-03-02 21:30')
  })

  it('keys the day on that clock', () => {
    expect(dayKeyOf(lateMonday, 'Asia/Yerevan')).toBe('2026-03-03')
    expect(dayKeyOf(lateMonday)).toBe('2026-03-02')
  })

  it('returns a local-midnight carrier for the zone date, for the month grids', () => {
    const carrier = calendarDayOf(lateMonday, 'Asia/Yerevan')

    expect(carrier.format('YYYY-MM-DD HH:mm')).toBe('2026-03-03 00:00')
    expect(carrier.isUTC()).toBe(false)
  })
})

describe('zone labels', () => {
  const winter = new Date('2026-01-15T12:00:00Z')

  it('names the zone and its offset in the given locale', () => {
    expect(formatUtcOffset('Asia/Yerevan', 'en', winter)).toBe('GMT+4')
    expect(formatTimeZoneName('Asia/Yerevan', 'en', winter)).toBe('Armenia Standard Time (GMT+4)')
    expect(formatTimeZoneName('America/New_York', 'en', winter)).toBe('Eastern Time (GMT-5)')
  })

  it('does not repeat an offset the name already is', () => {
    expect(formatTimeZoneName('UTC', 'en', winter)).not.toMatch(/\(.*\)/)
  })

  it('compares wall clocks, not names', () => {
    expect(isSameWallClock('Asia/Yerevan', 'Asia/Dubai', winter)).toBe(true)
    expect(isSameWallClock('Asia/Yerevan', 'Europe/Berlin', winter)).toBe(false)
  })
})

describe('fixed offsets', () => {
  const nineInYerevan = '2026-03-02T05:00:00.000Z'

  it('lists every whole hour from UTC−12 to UTC+12', () => {
    expect(UTC_OFFSET_HOURS).toHaveLength(25)
    expect(UTC_OFFSET_HOURS[0]).toBe(-12)
    expect(UTC_OFFSET_HOURS.at(-1)).toBe(12)
  })

  it('reads a whole-hour zone offset and refuses one that is not', () => {
    expect(wholeOffsetHours(new Date('2026-03-02T12:00:00Z'), 'Asia/Yerevan')).toBe(4)
    expect(wholeOffsetHours(new Date('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-5)
    expect(wholeOffsetHours(new Date('2026-03-02T12:00:00Z'), 'Asia/Kolkata')).toBeNull()
  })

  it('finds a weekday in the same Monday-first week', () => {
    // 2026-10-13 is a Tuesday.
    expect(weekdayInSameWeek('2026-10-13', 'monday')).toBe('2026-10-12')
    expect(weekdayInSameWeek('2026-10-13', 'tuesday')).toBe('2026-10-13')
    expect(weekdayInSameWeek('2026-10-13', 'sunday')).toBe('2026-10-18')
  })

  it('formats an instant on the picked offset, with the POSIX sign flipped', () => {
    expect(fixedOffsetZone(4)).toBe('Etc/GMT-4')
    expect(fixedOffsetZone(-5)).toBe('Etc/GMT+5')
    expect(fixedOffsetZone(0)).toBe('Etc/GMT')
    expect(inTimeZone(nineInYerevan, fixedOffsetZone(4)).format('HH:mm')).toBe('09:00')
    expect(inTimeZone(nineInYerevan, fixedOffsetZone(0)).format('HH:mm')).toBe('05:00')
    expect(formatUtcOffset(fixedOffsetZone(4), 'en')).toBe('GMT+4')
    expect(formatUtcOffset(fixedOffsetZone(-12), 'en')).toBe('GMT-12')
  })
})

describe('listTimeZones', () => {
  it("adds a stored zone the catalogue spells another way, so the picker can show it", () => {
    const zones = listTimeZones('Not/Listed')

    expect(zones[0]).toBe('Not/Listed')
    expect(zones).toContain('Asia/Yerevan')
    expect(listTimeZones('Asia/Yerevan').filter((zone) => zone === 'Asia/Yerevan')).toHaveLength(1)
  })
})
