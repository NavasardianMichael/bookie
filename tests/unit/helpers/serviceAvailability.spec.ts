import { describe, expect, it } from 'vitest'
import { day, LONG_AGO, makeWeekSchedule, MONDAY } from '@test/setup/fixtures'
import { getSlotsForDate, isOpenOnDate } from '@helpers/booking'
import {
  canEverBeBooked,
  isServiceDay,
  nextServiceDate,
  openWeekdays,
  weekdayOfDayKey,
} from '@helpers/serviceAvailability'

// Monday 09:00–10:00 and Wednesday 14:00–15:00; every other day closed. 2026-03-02 is a Monday.
const weekSchedule = makeWeekSchedule({ monday: day('09:00', '10:00'), wednesday: day('14:00', '15:00') })

// The shared rule (`effectiveDayParts`) is pinned against its server twin in
// `tests/unit/server/serviceAvailability.spec.ts`; these are the web-only pieces.

describe('weekdayOfDayKey', () => {
  it('reads the weekday of a calendar day, whatever the runtime zone', () => {
    expect(weekdayOfDayKey('2026-03-02')).toBe('monday')
    expect(weekdayOfDayKey('2026-03-08')).toBe('sunday')
  })
})

describe('isServiceDay', () => {
  it("is every day for an always service, before the provider's hours", () => {
    expect(isServiceDay(undefined, '2026-03-03')).toBe(true)
  })

  it('follows each rule', () => {
    expect(isServiceDay({ mode: 'weekdays', days: ['monday'] }, '2026-03-02')).toBe(true)
    expect(isServiceDay({ mode: 'monthDays', days: [3] }, '2026-03-02')).toBe(false)
    expect(isServiceDay({ mode: 'dates', dates: ['2026-03-02'] }, '2026-03-02')).toBe(true)
  })
})

describe('openWeekdays', () => {
  it('lists the weekdays the provider has hours on, in week order', () => {
    expect(openWeekdays(weekSchedule)).toEqual(['monday', 'wednesday'])
    expect(openWeekdays(undefined)).toEqual([])
  })
})

describe('canEverBeBooked', () => {
  const TODAY = '2026-03-01'

  it('is false when no chosen weekday is an open one', () => {
    expect(canEverBeBooked(weekSchedule, { mode: 'weekdays', days: ['tuesday'] }, TODAY)).toBe(false)
    expect(canEverBeBooked(weekSchedule, { mode: 'weekdays', days: ['tuesday', 'monday'] }, TODAY)).toBe(true)
  })

  it('is false when every chosen date is past or closed', () => {
    expect(canEverBeBooked(weekSchedule, { mode: 'dates', dates: ['2026-02-23', '2026-03-03'] }, TODAY)).toBe(false)
    expect(canEverBeBooked(weekSchedule, { mode: 'dates', dates: ['2026-03-04'] }, TODAY)).toBe(true)
  })

  // Every day of the month falls on every weekday sooner or later.
  it('is true for any month day while the provider is open at all', () => {
    expect(canEverBeBooked(weekSchedule, { mode: 'monthDays', days: [31] }, TODAY)).toBe(true)
    expect(canEverBeBooked(makeWeekSchedule(), { mode: 'monthDays', days: [31] }, TODAY)).toBe(false)
  })
})

describe('nextServiceDate', () => {
  it('is the first listed date from today on, for a dates service only', () => {
    expect(nextServiceDate({ mode: 'dates', dates: ['2026-02-01', '2026-03-01', '2026-04-01'] }, '2026-03-01')).toBe(
      '2026-03-01'
    )
    expect(nextServiceDate({ mode: 'dates', dates: ['2026-02-01'] }, '2026-03-01')).toBeUndefined()
    expect(nextServiceDate({ mode: 'weekdays', days: ['monday'] }, '2026-03-01')).toBeUndefined()
  })
})

describe('the booking grid with a service rule', () => {
  const slots = (availability?: Parameters<typeof getSlotsForDate>[0]['availability']) =>
    getSlotsForDate({ weekSchedule, availability, date: MONDAY, durationMinutes: 30, now: LONG_AGO, timeZone: 'UTC' })

  it('steps the provider hours on an offered day', () => {
    expect(slots({ mode: 'weekdays', days: ['monday'] })).toHaveLength(2)
  })

  it('has nothing on a day the service is not offered', () => {
    expect(slots({ mode: 'weekdays', days: ['wednesday'] })).toEqual([])
    expect(slots({ mode: 'monthDays', days: [3] })).toEqual([])
    expect(slots({ mode: 'dates', dates: ['2026-03-09'] })).toEqual([])
  })

  it('is unchanged without a rule', () => {
    expect(slots()).toEqual(slots({ mode: 'always' }))
    expect(slots()).toHaveLength(2)
  })

  it('tells a closed provider day from a day the service is off', () => {
    expect(isOpenOnDate(weekSchedule, MONDAY)).toBe(true)
    expect(isOpenOnDate(weekSchedule, MONDAY, { mode: 'weekdays', days: ['wednesday'] })).toBe(false)
  })
})
