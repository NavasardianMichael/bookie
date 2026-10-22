import { describe, expect, it } from 'vitest'
import { day, makeWeekSchedule } from '@test/setup/fixtures'
import * as web from '@helpers/serviceAvailability'
import * as server from '../../../server/src/lib/service-availability'

// 2026-03-02 is a Monday. Monday 09:00–12:00 with a 10:00–10:30 break, Wednesday 14:00–18:00,
// every other day closed.
const weekSchedule = makeWeekSchedule({
  monday: day('09:00', '12:00', [{ start: '10:00', end: '10:30' }]),
  wednesday: day('14:00', '18:00'),
})
const MONDAY_PARTS = [
  { start: '09:00', end: '10:00' },
  { start: '10:30', end: '12:00' },
]
const WEDNESDAY_PARTS = [{ start: '14:00', end: '18:00' }]

const everyDay = makeWeekSchedule({
  monday: day('09:00', '17:00'),
  tuesday: day('09:00', '17:00'),
  wednesday: day('09:00', '17:00'),
  thursday: day('09:00', '17:00'),
  friday: day('09:00', '17:00'),
  saturday: day('09:00', '17:00'),
  sunday: day('09:00', '17:00'),
})

/**
 * `src/helpers/serviceAvailability.ts` decides which days the booking grid offers;
 * `server/src/lib/service-availability.ts` refuses a booking outside them. They are twins —
 * the packages cannot import each other — so every case runs against both. A drift would
 * show a visitor a day the API then refuses, or hide one it would accept.
 */
describe.each([
  ['web', web.effectiveDayParts],
  ['server', server.effectiveDayParts],
] as const)('effectiveDayParts (%s)', (_, effectiveDayParts) => {
  it("is the provider's own windows for an always service, or one with no rule", () => {
    expect(effectiveDayParts({ weekSchedule, availability: { mode: 'always' }, dayKey: '2026-03-02' })).toEqual(
      MONDAY_PARTS
    )
    expect(effectiveDayParts({ weekSchedule, availability: undefined, dayKey: '2026-03-02' })).toEqual(MONDAY_PARTS)
  })

  it('offers a weekdays service only on its weekdays, during the provider hours', () => {
    const availability: server.ServiceAvailability = { mode: 'weekdays', days: ['wednesday'] }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-02' })).toEqual([])
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-04' })).toEqual(WEDNESDAY_PARTS)
  })

  // The provider's hours are the only time frame: a service cannot open a day they are closed.
  it('never offers a day the provider is closed', () => {
    expect(
      effectiveDayParts({ weekSchedule, availability: { mode: 'weekdays', days: ['tuesday'] }, dayKey: '2026-03-03' })
    ).toEqual([])
    expect(effectiveDayParts({ weekSchedule, availability: { mode: 'dates', dates: ['2026-03-03'] }, dayKey: '2026-03-03' })).toEqual(
      []
    )
  })

  it('offers a month-days service on those days of every month', () => {
    const availability: server.ServiceAvailability = { mode: 'monthDays', days: [2, 16] }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-02' })).toEqual(MONDAY_PARTS)
    expect(effectiveDayParts({ weekSchedule: everyDay, availability, dayKey: '2026-04-16' })).toEqual([
      { start: '09:00', end: '17:00' },
    ])
    expect(effectiveDayParts({ weekSchedule: everyDay, availability, dayKey: '2026-04-17' })).toEqual([])
  })

  // April has no 31st: the rule simply has no day in it, rather than falling on the 30th.
  it('skips a day of the month the month does not have', () => {
    const availability: server.ServiceAvailability = { mode: 'monthDays', days: [31] }
    expect(effectiveDayParts({ weekSchedule: everyDay, availability, dayKey: '2026-03-31' })).toHaveLength(1)
    expect(effectiveDayParts({ weekSchedule: everyDay, availability, dayKey: '2026-04-30' })).toEqual([])
    expect(effectiveDayParts({ weekSchedule: everyDay, availability, dayKey: '2026-05-01' })).toEqual([])
  })

  it('offers a dates service on its dates only', () => {
    const availability: server.ServiceAvailability = { mode: 'dates', dates: ['2026-03-04'] }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-04' })).toEqual(WEDNESDAY_PARTS)
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-11' })).toEqual([])
  })
})

describe('parseServiceAvailability', () => {
  const TODAY = '2026-03-01'
  const parse = (raw: unknown) => server.parseServiceAvailability(raw, TODAY)

  it('reads absent, empty and always as null — the column meaning "always"', () => {
    expect(parse(undefined)).toEqual({ value: null })
    expect(parse('')).toEqual({ value: null })
    expect(parse({ mode: 'always' })).toEqual({ value: null })
  })

  it('normalises weekdays into week order, without duplicates', () => {
    expect(parse({ mode: 'weekdays', days: ['friday', 'monday', 'friday'] })).toEqual({
      value: { mode: 'weekdays', days: ['monday', 'friday'] },
    })
  })

  it('sorts and de-duplicates month days', () => {
    expect(parse({ mode: 'monthDays', days: [16, 1, 16] })).toEqual({ value: { mode: 'monthDays', days: [1, 16] } })
  })

  it('sorts dates and drops the ones already gone', () => {
    expect(parse({ mode: 'dates', dates: ['2026-03-20', '2026-02-27', '2026-03-05'] })).toEqual({
      value: { mode: 'dates', dates: ['2026-03-05', '2026-03-20'] },
    })
  })

  it.each([
    ['an unknown mode', { mode: 'hourly' }],
    ['a non-object', 'weekdays'],
    ['an unknown weekday', { mode: 'weekdays', days: ['funday'] }],
    ['no weekdays', { mode: 'weekdays', days: [] }],
    ['day 0', { mode: 'monthDays', days: [0] }],
    ['day 32', { mode: 'monthDays', days: [32] }],
    ['a fractional day', { mode: 'monthDays', days: [1.5] }],
    ['no month days', { mode: 'monthDays', days: [] }],
    ['a date that does not exist', { mode: 'dates', dates: ['2026-02-30'] }],
    ['a malformed date', { mode: 'dates', dates: ['3/5/2026'] }],
    ['only past dates', { mode: 'dates', dates: ['2026-02-01'] }],
  ])('refuses %s', (_, raw) => {
    expect(parse(raw)).toHaveProperty('error')
  })

  it(`refuses more than ${server.MAX_SERVICE_DATES} dates`, () => {
    const dates = Array.from({ length: server.MAX_SERVICE_DATES + 1 }, (_, index) =>
      new Date(Date.UTC(2026, 2, 1 + index)).toISOString().slice(0, 10)
    )
    expect(parse({ mode: 'dates', dates })).toHaveProperty('error')
  })
})

describe('toServiceAvailability', () => {
  it('reads NULL and an unreadable stored value as always', () => {
    expect(server.toServiceAvailability(null)).toEqual({ mode: 'always' })
    expect(server.toServiceAvailability({ mode: 'nonsense' })).toEqual({ mode: 'always' })
  })

  it('keeps a stored past date — it is pruned on the next write, not on read', () => {
    expect(server.toServiceAvailability({ mode: 'dates', dates: ['2020-01-01'] })).toEqual({
      mode: 'dates',
      dates: ['2020-01-01'],
    })
  })
})

describe('isWithinBookableHours', () => {
  // Yerevan is UTC+4 with no DST: 09:00 there is 05:00Z.
  const check = (startAt: string, endAt: string, availability: server.ServiceAvailability = { mode: 'always' }) =>
    server.isWithinBookableHours({
      weekSchedule,
      availability,
      timeZone: 'Asia/Yerevan',
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    })

  it('accepts a booking inside a window', () => {
    expect(check('2026-03-02T05:00:00Z', '2026-03-02T05:30:00Z')).toBe(true)
    expect(check('2026-03-02T07:30:00Z', '2026-03-02T08:00:00Z')).toBe(true)
  })

  // Fit, not alignment: 09:10 is off a 30-minute grid but inside the hours.
  it('accepts a booking off the grid but inside a window', () => {
    expect(check('2026-03-02T05:10:00Z', '2026-03-02T05:40:00Z')).toBe(true)
  })

  it('refuses a booking that runs into a break or past closing', () => {
    expect(check('2026-03-02T05:45:00Z', '2026-03-02T06:15:00Z')).toBe(false)
    expect(check('2026-03-02T07:45:00Z', '2026-03-02T08:15:00Z')).toBe(false)
  })

  it('refuses a booking on a day the provider is closed', () => {
    expect(check('2026-03-03T05:00:00Z', '2026-03-03T05:30:00Z')).toBe(false)
  })

  it('refuses a booking inside the provider hours on a day the service is not offered', () => {
    expect(check('2026-03-02T05:00:00Z', '2026-03-02T05:30:00Z', { mode: 'weekdays', days: ['wednesday'] })).toBe(false)
    expect(check('2026-03-04T10:00:00Z', '2026-03-04T10:30:00Z', { mode: 'weekdays', days: ['wednesday'] })).toBe(true)
  })

  // 2026-03-08 is the day New York springs forward: 09:00 EDT is 13:00Z, not 14:00Z.
  it("reads the provider's clock across a DST change", () => {
    const sunday = makeWeekSchedule({ sunday: day('09:00', '17:00') })
    const run = (startAt: string, endAt: string) =>
      server.isWithinBookableHours({
        weekSchedule: sunday,
        availability: null,
        timeZone: 'America/New_York',
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      })
    expect(run('2026-03-08T13:00:00Z', '2026-03-08T13:30:00Z')).toBe(true)
    expect(run('2026-03-08T12:30:00Z', '2026-03-08T13:00:00Z')).toBe(false)
  })

  // Without a zone the visitor's browser read the hours on its own clock, which the server cannot know.
  it('does not check a provider with no time zone', () => {
    expect(
      server.isWithinBookableHours({
        weekSchedule,
        availability: { mode: 'weekdays', days: ['wednesday'] },
        timeZone: null,
        startAt: new Date('2026-03-03T03:00:00Z'),
        endAt: new Date('2026-03-03T03:30:00Z'),
      })
    ).toBe(true)
  })
})

describe('earliestOpenDayKey', () => {
  // Behind every zone's today, so a date that is still today in Honolulu is kept.
  it('is the UTC day before', () => {
    expect(server.earliestOpenDayKey(new Date('2026-03-01T02:00:00Z'))).toBe('2026-02-28')
  })
})
