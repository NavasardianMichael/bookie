import { describe, expect, it } from 'vitest'
import { day, makeWeekSchedule } from '@test/setup/fixtures'
import {
  fitServiceToHours,
  hasConflicts,
  scheduleImpact,
  serviceConflicts,
  usualDayHours,
  widenWeekForService,
} from '@helpers/scheduleConflicts'

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
})

describe('fitServiceToHours', () => {
  it('drops the weekdays the provider is closed on', () => {
    const availability = { mode: 'weekdays' as const, days: ['monday' as const, 'tuesday' as const] }
    const conflicts = serviceConflicts({ weekSchedule, availability, todayKey: TODAY })
    expect(fitServiceToHours(conflicts, availability, { weekSchedule }, TODAY)).toEqual({ mode: 'weekdays', days: ['monday'] })
  })

  it('cuts the service hours to the provider hours', () => {
    const availability = { mode: 'always' as const, hours: [{ start: '15:00', end: '19:00' }] }
    const conflicts = serviceConflicts({ weekSchedule, availability, todayKey: TODAY })
    expect(fitServiceToHours(conflicts, availability, { weekSchedule }, TODAY)).toEqual({
      mode: 'always',
      hours: [{ start: '15:00', end: '17:00' }],
    })
  })

  it('is null when nothing would be left to book', () => {
    const availability = { mode: 'weekdays' as const, days: ['tuesday' as const] }
    const conflicts = serviceConflicts({ weekSchedule, availability, todayKey: TODAY })
    expect(fitServiceToHours(conflicts, availability, { weekSchedule }, TODAY)).toBeNull()
  })
})

describe('fitServiceToHours keeps what it does not cut', () => {
  it('carries the kept weekdays\' own hours and the added / excluded dates along', () => {
    const availability = {
      mode: 'weekdays' as const,
      days: ['monday' as const, 'tuesday' as const],
      hoursByDay: { monday: [{ start: '10:00', end: '12:00' }], tuesday: [{ start: '10:00', end: '12:00' }] },
      exceptions: [{ from: '2026-03-16', to: '2026-03-16', kind: 'closed' as const }],
    }
    const conflicts = serviceConflicts({ weekSchedule, availability, todayKey: TODAY })
    expect(fitServiceToHours(conflicts, availability, { weekSchedule }, TODAY)).toEqual({
      mode: 'weekdays',
      days: ['monday'],
      hoursByDay: { monday: [{ start: '10:00', end: '12:00' }] },
      exceptions: availability.exceptions,
    })
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
})
