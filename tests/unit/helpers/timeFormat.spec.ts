import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'
import { TIME_FORMATS } from '@constants/schedule'
import {
  getHourCycle,
  getLocaleTimeFormat,
  getTimeDisplayFormat,
  resolveTimeFormat,
  scheduleTimeToDate,
} from '@helpers/timeFormat'

dayjs.extend(utc)

describe('getLocaleTimeFormat', () => {
  // A provider who never chose is read on each visitor's own convention.
  it("answers the locale's own clock", () => {
    expect(getLocaleTimeFormat('en')).toBe(TIME_FORMATS.h12)
    expect(getLocaleTimeFormat('hy')).toBe(TIME_FORMATS.h24)
    expect(getLocaleTimeFormat('de')).toBe(TIME_FORMATS.h24)
    expect(getLocaleTimeFormat('ru')).toBe(TIME_FORMATS.h24)
  })
})

describe('resolveTimeFormat', () => {
  it("prefers the provider's choice over the locale", () => {
    expect(resolveTimeFormat(TIME_FORMATS.h24, 'en')).toBe(TIME_FORMATS.h24)
    expect(resolveTimeFormat(TIME_FORMATS.h12, 'hy')).toBe(TIME_FORMATS.h12)
  })

  it('falls back to the locale when nothing was chosen', () => {
    expect(resolveTimeFormat(undefined, 'en')).toBe(TIME_FORMATS.h12)
    expect(resolveTimeFormat(null, 'hy')).toBe(TIME_FORMATS.h24)
  })
})

describe('getTimeDisplayFormat', () => {
  it('formats one time on either clock', () => {
    const evening = dayjs.utc('2026-03-04T21:05:00Z')

    expect(evening.format(getTimeDisplayFormat(TIME_FORMATS.h12))).toBe('09:05 PM')
    expect(evening.format(getTimeDisplayFormat(TIME_FORMATS.h24))).toBe('21:05')
  })
})

describe('getHourCycle', () => {
  const format = (timeFormat: Parameters<typeof getHourCycle>[0], locale: string): string =>
    new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: getHourCycle(timeFormat),
      timeZone: 'UTC',
    }).format(scheduleTimeToDate('21:05'))

  it("overrides the locale's clock either way", () => {
    expect(format(TIME_FORMATS.h24, 'en')).toBe('21:05')
    expect(format(TIME_FORMATS.h12, 'hy')).toMatch(/^09:05\s?PM$/)
  })

  it("leaves the locale's clock when nothing was chosen", () => {
    expect(getHourCycle(undefined)).toBeUndefined()
    expect(getHourCycle(null)).toBeUndefined()
    expect(format(undefined, 'hy')).toBe('21:05')
  })

  // `h24` would print midnight as 24:00.
  it('prints midnight as 00:00 on the 24-hour clock', () => {
    expect(
      new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hourCycle: getHourCycle(TIME_FORMATS.h24), timeZone: 'UTC' }).format(
        scheduleTimeToDate('00:00')
      )
    ).toBe('00:00')
  })
})

describe('scheduleTimeToDate', () => {
  it("carries a schedule's wall-clock time in its UTC fields", () => {
    const date = scheduleTimeToDate('09:30')

    expect(date.getUTCHours()).toBe(9)
    expect(date.getUTCMinutes()).toBe(30)
  })
})
