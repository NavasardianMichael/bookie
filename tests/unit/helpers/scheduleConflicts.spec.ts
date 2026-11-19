import { describe, expect, it } from 'vitest'
import { day, makeWeekSchedule } from '@test/setup/fixtures'
import { ServiceAvailability } from '@store/providers/profile/types'
import {
  fitServiceToHours,
  hasConflicts,
  scheduleImpact,
  serviceConflicts,
  usualDayHours,
  widenWeekForService,
} from '@helpers/scheduleConflicts'
import { addDaysToDayKey, effectiveDayParts } from '@helpers/serviceAvailability'

// 2026-03-02 is a Monday. Open Monday and Wednesday 09:00–17:00; closed otherwise.
const weekSchedule = makeWeekSchedule({ monday: day('09:00', '17:00'), wednesday: day('09:00', '17:00') })
const TODAY = '2026-03-02'

describe('serviceConflicts', () => {
  it('never flags a plain always service — it means "whenever you are open"', () => {
    expect(hasConflicts(serviceConflicts({ weekSchedule, availability: { mode: 'always' }, todayKey: TODAY }))).toBe(false)
  })

  it('groups the closed days a weekday rule asks for, by weekday', () => {
    const conflicts = serviceConflicts({
      weekSchedule,
      availability: { mode: 'weekdays', days: ['monday', 'tuesday'] },
      todayKey: TODAY,
      horizonDays: 14,
    })
    expect(conflicts.weekly).toEqual([{ day: 'tuesday', reason: 'closed', dates: ['2026-03-03', '2026-03-10'] }])
    expect(conflicts.special).toEqual([])
  })

  it('flags hours that run past the provider, on open days only for always', () => {
    const conflicts = serviceConflicts({
      weekSchedule,
      availability: { mode: 'always', hours: [{ start: '16:00', end: '19:00' }] },
      todayKey: TODAY,
      horizonDays: 7,
    })
    expect(conflicts.weekly.map((c) => [c.day, c.reason])).toEqual([
      ['monday', 'hours'],
      ['wednesday', 'hours'],
    ])
  })

  it('blames a special date rather than the week when one closes the day', () => {
    const conflicts = serviceConflicts({
      weekSchedule,
      specialDates: [{ from: '2026-03-04', to: '2026-03-04', kind: 'closed', hours: null, note: 'Holiday' }],
      availability: { mode: 'weekdays', days: ['wednesday'] },
      todayKey: TODAY,
      horizonDays: 7,
    })
    expect(conflicts.weekly).toEqual([])
    expect(conflicts.special.map((c) => [c.entry.note, c.reason, c.dates])).toEqual([['Holiday', 'closed', ['2026-03-04']]])
  })

  it("checks each weekday's own hours", () => {
    const conflicts = serviceConflicts({
      weekSchedule,
      availability: {
        mode: 'weekdays',
        days: ['monday', 'wednesday'],
        hoursByDay: { monday: [{ start: '10:00', end: '12:00' }], wednesday: [{ start: '16:00', end: '18:00' }] },
      },
      todayKey: TODAY,
      horizonDays: 7,
    })
    expect(conflicts.weekly.map((c) => [c.day, c.reason])).toEqual([['wednesday', 'hours']])
  })

  it('checks days of the month', () => {
    // March 2026: the 3rd is a Tuesday (closed), the 4th a Wednesday (open).
    const conflicts = serviceConflicts({
      weekSchedule,
      availability: { mode: 'monthDays', days: [3, 4] },
      todayKey: TODAY,
      horizonDays: 7,
    })
    expect(conflicts.weekly).toEqual([{ day: 'tuesday', reason: 'closed', dates: ['2026-03-03'] }])
  })

  it("names the service's own added dates apart, even on an always rule", () => {
    const added = { from: '2026-03-07', to: '2026-03-07', kind: 'open' as const }
    const conflicts = serviceConflicts({
      weekSchedule,
      availability: { mode: 'always', exceptions: [added] },
      todayKey: TODAY,
      horizonDays: 7,
    })
    expect(conflicts).toEqual({ weekly: [], special: [], added: [{ entry: added, reason: 'closed', dates: ['2026-03-07'] }] })
  })

  it('asks nothing on an excluded day, and only the rest of the hours on a partly excluded one', () => {
    const conflicts = serviceConflicts({
      weekSchedule,
      availability: {
        mode: 'weekdays',
        days: ['monday', 'tuesday'],
        hours: [{ start: '15:00', end: '19:00' }],
        exceptions: [
          { from: '2026-03-02', to: '2026-03-02', kind: 'closed', hours: [{ start: '17:00', end: '19:00' }] },
          { from: '2026-03-03', to: '2026-03-03', kind: 'closed' },
        ],
      },
      todayKey: TODAY,
      horizonDays: 7,
    })
    expect(hasConflicts(conflicts)).toBe(false)
  })
})

describe('widenWeekForService', () => {
  it("opens a closed weekday on the service's hours, or the usual ones", () => {
    const own = { mode: 'weekdays' as const, days: ['tuesday' as const], hours: [{ start: '10:00', end: '12:00' }] }
    const conflicts = serviceConflicts({ weekSchedule, availability: own, todayKey: TODAY, horizonDays: 7 })
    expect(widenWeekForService(conflicts, weekSchedule, own)).toEqual([
      expect.objectContaining({ day: 'tuesday', before: [], after: [{ start: '10:00', end: '12:00' }] }),
    ])

    const plain = { mode: 'weekdays' as const, days: ['tuesday' as const] }
    const plainConflicts = serviceConflicts({ weekSchedule, availability: plain, todayKey: TODAY, horizonDays: 7 })
    expect(widenWeekForService(plainConflicts, weekSchedule, plain)[0]?.after).toEqual(usualDayHours(weekSchedule))
  })

  it('stretches a day to cover the service hours, keeping its own windows', () => {
    const own = { mode: 'weekdays' as const, days: ['monday' as const], hours: [{ start: '16:00', end: '19:00' }] }
    const conflicts = serviceConflicts({ weekSchedule, availability: own, todayKey: TODAY, horizonDays: 7 })
    expect(widenWeekForService(conflicts, weekSchedule, own)[0]?.after).toEqual([{ start: '09:00', end: '19:00' }])
  })

  it("uses that weekday's own hours", () => {
    const own: ServiceAvailability = {
      mode: 'weekdays',
      days: ['tuesday'],
      hours: [{ start: '09:00', end: '10:00' }],
      hoursByDay: { tuesday: [{ start: '13:00', end: '15:00' }] },
    }
    const conflicts = serviceConflicts({ weekSchedule, availability: own, todayKey: TODAY, horizonDays: 7 })
    expect(widenWeekForService(conflicts, weekSchedule, own)[0]?.after).toEqual([{ start: '13:00', end: '15:00' }])
  })

  it('offers nothing when the hours do not follow the week', () => {
    const own = { mode: 'weekdays' as const, days: ['tuesday' as const] }
    const rule = { mode: 'dates' as const }
    const conflicts = serviceConflicts({ weekSchedule, rule, availability: own, todayKey: TODAY, horizonDays: 7 })
    expect(widenWeekForService(conflicts, weekSchedule, own, rule)).toEqual([])
  })
})

/** Every window bookable before the fit is bookable after it, on every day of the next year. */
const expectNothingLost = (before: ServiceAvailability, after: ServiceAvailability, hours: Parameters<typeof effectiveDayParts>[0]): void => {
  for (let offset = 0; offset < 366; offset += 1) {
    const dayKey = addDaysToDayKey(TODAY, offset)
    expect([dayKey, effectiveDayParts({ ...hours, availability: after, dayKey })]).toEqual([
      dayKey,
      effectiveDayParts({ ...hours, availability: before, dayKey }),
    ])
  }
}

describe('fitServiceToHours', () => {
  it('drops the weekdays the provider is closed on', () => {
    const availability = { mode: 'weekdays' as const, days: ['monday' as const, 'tuesday' as const] }
    expect(fitServiceToHours(availability, { weekSchedule }, TODAY)).toEqual({ mode: 'weekdays', days: ['monday'] })
  })

  it('cuts the service hours to the provider hours', () => {
    const availability = { mode: 'always' as const, hours: [{ start: '15:00', end: '19:00' }] }
    expect(fitServiceToHours(availability, { weekSchedule }, TODAY)).toEqual({
      mode: 'always',
      hours: [{ start: '15:00', end: '17:00' }],
    })
  })

  it('is null when nothing would be left to book', () => {
    const availability = { mode: 'weekdays' as const, days: ['tuesday' as const] }
    expect(fitServiceToHours(availability, { weekSchedule }, TODAY)).toBeNull()
  })

  it("carries the kept weekdays' own hours and the excluded dates along", () => {
    const availability = {
      mode: 'weekdays' as const,
      days: ['monday' as const, 'tuesday' as const],
      hoursByDay: { monday: [{ start: '10:00', end: '12:00' }], tuesday: [{ start: '10:00', end: '12:00' }] },
      exceptions: [{ from: '2026-03-16', to: '2026-03-16', kind: 'closed' as const }],
    }
    expect(fitServiceToHours(availability, { weekSchedule }, TODAY)).toEqual({
      mode: 'weekdays',
      days: ['monday'],
      hoursByDay: { monday: [{ start: '10:00', end: '12:00' }] },
      exceptions: availability.exceptions,
    })
  })

  it('turns one set of hours the provider keeps differently by day into per-day hours, losing nothing', () => {
    const week = makeWeekSchedule({ monday: day('09:00', '17:00'), wednesday: day('12:00', '20:00') })
    const availability: ServiceAvailability = {
      mode: 'weekdays',
      days: ['monday', 'wednesday'],
      hours: [{ start: '10:00', end: '19:00' }],
    }
    const fitted = fitServiceToHours(availability, { weekSchedule: week }, TODAY)
    expect(fitted).toEqual({
      mode: 'weekdays',
      days: ['monday', 'wednesday'],
      hoursByDay: { monday: [{ start: '10:00', end: '17:00' }], wednesday: [{ start: '12:00', end: '19:00' }] },
    })
    expectNothingLost(availability, fitted!, { weekSchedule: week, dayKey: TODAY })
  })

  it('keeps a weekday the provider opens only on a special date', () => {
    const specialDates = [{ from: '2026-04-07', to: '2026-04-07', kind: 'open' as const, hours: day('10:00', '14:00'), note: '' }]
    const availability: ServiceAvailability = { mode: 'weekdays', days: ['monday', 'tuesday'] }
    expect(fitServiceToHours(availability, { weekSchedule, specialDates }, TODAY)).toEqual(availability)
  })

  it('drops days of the month a month-day provider never opens on', () => {
    const rule = { mode: 'monthDays' as const, days: [1, 15], hours: day('09:00', '17:00') }
    const availability: ServiceAvailability = { mode: 'monthDays', days: [1, 2, 15], lastDay: true }
    const fitted = fitServiceToHours(availability, { weekSchedule, rule }, TODAY)
    expect(fitted).toEqual({ mode: 'monthDays', days: [1, 15] })
    expectNothingLost(availability, fitted!, { weekSchedule, rule, dayKey: TODAY })
  })

  it('drops specific days the provider is closed on, keeping past ones', () => {
    const availability: ServiceAvailability = { mode: 'dates', dates: ['2026-03-01', '2026-03-03', '2026-03-04'] }
    expect(fitServiceToHours(availability, { weekSchedule }, TODAY)).toEqual({
      mode: 'dates',
      dates: ['2026-03-01', '2026-03-04'],
    })
  })

  it('drops added dates the provider is closed on and cuts their hours to the provider', () => {
    const availability: ServiceAvailability = {
      mode: 'weekdays',
      days: ['monday'],
      exceptions: [
        { from: '2026-03-07', to: '2026-03-07', kind: 'open' },
        { from: '2026-03-11', to: '2026-03-11', kind: 'open', hours: [{ start: '16:00', end: '19:00' }] },
      ],
    }
    const fitted = fitServiceToHours(availability, { weekSchedule }, TODAY)
    expect(fitted).toEqual({
      mode: 'weekdays',
      days: ['monday'],
      exceptions: [{ from: '2026-03-11', to: '2026-03-11', kind: 'open', hours: [{ start: '16:00', end: '17:00' }] }],
    })
    expectNothingLost(availability, fitted!, { weekSchedule, dayKey: TODAY })
  })
})

describe('scheduleImpact', () => {
  const dayAndMinutes = (iso: string) => {
    const date = new Date(iso)
    return { dayKey: iso.slice(0, 10), minutes: date.getUTCHours() * 60 + date.getUTCMinutes() }
  }

  it('names services that can no longer be booked and bookings left outside the hours', () => {
    const impact = scheduleImpact({
      before: { weekSchedule },
      after: { weekSchedule: makeWeekSchedule({ monday: day('09:00', '12:00') }) },
      services: [
        { name: 'Wednesdays', active: true, availability: { mode: 'weekdays', days: ['wednesday'] } },
        { name: 'Off', active: false, availability: { mode: 'weekdays', days: ['wednesday'] } },
        { name: 'Any day', active: true, availability: { mode: 'always' } },
      ],
      bookings: [
        { id: 'late', start: '2026-03-09T14:00:00Z', end: '2026-03-09T15:00:00Z', serviceName: 'Cut', clientName: 'Mia' },
        { id: 'early', start: '2026-03-09T09:00:00Z', end: '2026-03-09T10:00:00Z', serviceName: 'Cut', clientName: 'Leo' },
      ],
      todayKey: TODAY,
      dayAndMinutes,
    })
    expect(impact.unbookable).toEqual(['Wednesdays'])
    expect(impact.bookingsOutside.map((booking) => booking.id)).toEqual(['late'])
  })

  it('names a service that keeps some days as narrowed', () => {
    const impact = scheduleImpact({
      before: { weekSchedule },
      after: { weekSchedule: makeWeekSchedule({ monday: day('09:00', '17:00') }) },
      services: [{ name: 'Mon & Wed', active: true, availability: { mode: 'weekdays', days: ['monday', 'wednesday'] } }],
      bookings: [],
      todayKey: TODAY,
      dayAndMinutes,
    })
    expect(impact.narrowed.map((service) => service.name)).toEqual(['Mon & Wed'])
    expect(impact.unbookable).toEqual([])
  })
})
