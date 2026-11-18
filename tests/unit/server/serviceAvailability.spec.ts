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

describe.each([
  ['web', web.effectiveDayParts],
  ['server', server.effectiveDayParts],
] as const)('effectiveDayParts with special dates and service hours (%s)', (_, effectiveDayParts) => {
  const specialDates: server.SpecialDate[] = [
    // Monday 2 March closed for a holiday; Tuesday 3 March (normally closed) open 10:00–13:00.
    { from: '2026-03-02', to: '2026-03-02', kind: 'closed', hours: null, note: 'Holiday' },
    { from: '2026-03-03', to: '2026-03-03', kind: 'open', hours: day('10:00', '13:00') },
  ]

  it('lets a special date close a day the week opens', () => {
    expect(effectiveDayParts({ weekSchedule, specialDates, availability: undefined, dayKey: '2026-03-02' })).toEqual([])
    // The Monday after follows the week again.
    expect(effectiveDayParts({ weekSchedule, specialDates, availability: undefined, dayKey: '2026-03-09' })).toEqual(
      MONDAY_PARTS
    )
  })

  it('lets a special date open a day the week closes, on its own hours', () => {
    expect(effectiveDayParts({ weekSchedule, specialDates, availability: undefined, dayKey: '2026-03-03' })).toEqual([
      { start: '10:00', end: '13:00' },
    ])
  })

  it("cuts the provider's windows to the service's own hours", () => {
    const availability: server.ServiceAvailability = { mode: 'always', hours: [{ start: '09:30', end: '11:00' }] }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-02' })).toEqual([
      { start: '09:30', end: '10:00' },
      { start: '10:30', end: '11:00' },
    ])
  })

  // A service's hours narrow; they never open time the provider does not keep.
  it('never widens the provider hours with the service hours', () => {
    const availability: server.ServiceAvailability = { mode: 'always', hours: [{ start: '07:00', end: '20:00' }] }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-04' })).toEqual(WEDNESDAY_PARTS)
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-05' })).toEqual([])
  })
})

describe('parseServiceAvailability with hours', () => {
  it('keeps "always" with hours as an object, merged and sorted', () => {
    expect(
      server.parseServiceAvailability(
        { mode: 'always', hours: [{ start: '14:00', end: '16:00' }, { start: '09:00', end: '12:00' }, { start: '11:00', end: '13:00' }] },
        '2026-01-01'
      )
    ).toEqual({
      value: {
        mode: 'always',
        hours: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '16:00' },
        ],
      },
    })
  })

  it('reads empty hours as none', () => {
    expect(server.parseServiceAvailability({ mode: 'always', hours: [] }, '2026-01-01')).toEqual({ value: null })
  })

  it('refuses a window that ends before it starts', () => {
    expect(server.parseServiceAvailability({ mode: 'always', hours: [{ start: '12:00', end: '09:00' }] }, '2026-01-01')).toHaveProperty(
      'error'
    )
  })
})

describe('parseSpecialDates', () => {
  it('sorts, drops the ones already gone, and reads an empty window as closed', () => {
    expect(
      server.parseSpecialDates(
        [
          // Written before kind existed: an empty window reads as closed.
          { from: '2026-03-10', to: '2026-03-12', hours: { availability: { start: '', end: '' }, breaks: [] } },
          { from: '2026-03-05', hours: day('10:00', '14:00'), note: '  Long day  ' },
          { from: '2026-02-01', to: '2026-02-02', kind: 'closed', hours: null },
        ],
        '2026-03-01'
      )
    ).toEqual({
      value: [
        { from: '2026-03-05', to: '2026-03-05', kind: 'open', hours: day('10:00', '14:00'), note: 'Long day' },
        { from: '2026-03-10', to: '2026-03-12', kind: 'closed', hours: null },
      ],
    })
  })

  it('refuses an overlap, a reversed run and breaks outside the day', () => {
    const today = '2026-03-01'
    expect(
      server.parseSpecialDates(
        [
          { from: '2026-03-10', to: '2026-03-12', kind: 'closed', hours: null },
          { from: '2026-03-12', to: '2026-03-14', kind: 'closed', hours: null },
        ],
        today
      )
    ).toHaveProperty('error')
    expect(server.parseSpecialDates([{ from: '2026-03-12', to: '2026-03-10', kind: 'closed', hours: null }], today)).toHaveProperty('error')
    expect(
      server.parseSpecialDates([{ from: '2026-03-12', hours: day('10:00', '12:00', [{ start: '09:00', end: '10:30' }]) }], today)
    ).toHaveProperty('error')
  })
})

describe('isWithinBookableHours with special dates', () => {
  it('refuses a booking on a special date the provider closed', () => {
    expect(
      server.isWithinBookableHours({
        weekSchedule,
        specialDates: [{ from: '2026-03-02', to: '2026-03-02', kind: 'closed', hours: null }],
        availability: null,
        timeZone: 'UTC',
        startAt: new Date('2026-03-02T09:00:00Z'),
        endAt: new Date('2026-03-02T09:30:00Z'),
      })
    ).toBe(false)
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

// 2026-04 has 30 days; 2026-03-02 is a Monday.
const nineToFive = day('09:00', '17:00')

describe.each([
  ['web', web.providerDayParts],
  ['server', server.providerDayParts],
] as const)('providerDayParts rules (%s)', (_, providerDayParts) => {
  const monthly = { mode: 'monthDays' as const, days: [1, 15, 31], hours: nineToFive }

  it('opens a days-of-the-month rule on those days only, at its hours', () => {
    expect(providerDayParts({ weekSchedule, rule: monthly, dayKey: '2026-03-15' })).toEqual([{ start: '09:00', end: '17:00' }])
    // Monday has weekly hours, but the weekly schedule does not answer under another rule.
    expect(providerDayParts({ weekSchedule, rule: monthly, dayKey: '2026-03-02' })).toEqual([])
  })

  it('skips a listed day a short month lacks, or moves it to the last day', () => {
    expect(providerDayParts({ weekSchedule, rule: monthly, dayKey: '2026-04-30' })).toEqual([])
    expect(
      providerDayParts({ weekSchedule, rule: { ...monthly, shortMonths: 'last' }, dayKey: '2026-04-30' })
    ).toEqual([{ start: '09:00', end: '17:00' }])
    expect(
      providerDayParts({ weekSchedule, rule: { ...monthly, days: [5], lastDay: true }, dayKey: '2026-02-28' })
    ).toEqual([{ start: '09:00', end: '17:00' }])
  })

  it('opens only the added dates under the specific-dates rule', () => {
    const specialDates = [{ from: '2026-03-04', to: '2026-03-04', kind: 'open' as const, hours: day('10:00', '12:00') }]
    expect(providerDayParts({ weekSchedule, specialDates, rule: { mode: 'dates' }, dayKey: '2026-03-04' })).toEqual([
      { start: '10:00', end: '12:00' },
    ])
    expect(providerDayParts({ weekSchedule, specialDates, rule: { mode: 'dates' }, dayKey: '2026-03-02' })).toEqual([])
  })

  it('closes only the listed ranges of a day for a closed entry with hours', () => {
    const specialDates = [{ from: '2026-03-04', to: '2026-03-04', kind: 'closed' as const, hours: day('15:00', '16:00') }]
    expect(providerDayParts({ weekSchedule, specialDates, dayKey: '2026-03-04' })).toEqual([
      { start: '14:00', end: '15:00' },
      { start: '16:00', end: '18:00' },
    ])
  })
})

describe.each([
  ['web', web.effectiveDayParts],
  ['server', server.effectiveDayParts],
] as const)('effectiveDayParts with per-day hours and exceptions (%s)', (_, effectiveDayParts) => {
  it("gives each weekday its own hours, still inside the provider's", () => {
    const availability = {
      mode: 'weekdays' as const,
      days: ['monday' as const, 'wednesday' as const],
      hours: [{ start: '09:00', end: '18:00' }],
      hoursByDay: { wednesday: [{ start: '15:00', end: '20:00' }] },
    }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-04' })).toEqual([{ start: '15:00', end: '18:00' }])
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-02' })).toEqual(MONDAY_PARTS)
  })

  it('adds a date the rule leaves out, takes one away, or cuts some of its hours', () => {
    const availability = {
      mode: 'weekdays' as const,
      days: ['monday' as const],
      exceptions: [
        { from: '2026-03-04', to: '2026-03-04', kind: 'open' as const },
        { from: '2026-03-09', to: '2026-03-09', kind: 'closed' as const },
        { from: '2026-03-16', to: '2026-03-16', kind: 'closed' as const, hours: [{ start: '09:00', end: '10:00' }] },
      ],
    }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-04' })).toEqual(WEDNESDAY_PARTS)
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-09' })).toEqual([])
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-16' })).toEqual([{ start: '10:30', end: '12:00' }])
  })

  it('never opens an added date the provider is closed on', () => {
    const availability = { mode: 'always' as const, exceptions: [{ from: '2026-03-03', to: '2026-03-03', kind: 'open' as const }] }
    expect(effectiveDayParts({ weekSchedule, availability, dayKey: '2026-03-03' })).toEqual([])
  })
})

describe('parseScheduleRule', () => {
  it('reads weekdays, dates, and month days with their hours', () => {
    expect(server.parseScheduleRule(undefined)).toEqual({ value: { mode: 'weekdays' } })
    expect(server.parseScheduleRule({ mode: 'dates' })).toEqual({ value: { mode: 'dates' } })
    expect(
      server.parseScheduleRule({ mode: 'monthDays', days: [15, 1, 1], lastDay: true, shortMonths: 'last', hours: nineToFive })
    ).toEqual({ value: { mode: 'monthDays', days: [1, 15], lastDay: true, shortMonths: 'last', hours: nineToFive } })
  })

  it('refuses month days without days or hours, and an unknown mode', () => {
    expect(server.parseScheduleRule({ mode: 'monthDays', days: [], hours: nineToFive })).toHaveProperty('error')
    expect(server.parseScheduleRule({ mode: 'monthDays', days: [1], hours: null })).toHaveProperty('error')
    expect(server.parseScheduleRule({ mode: 'yearly' })).toHaveProperty('error')
    expect(server.toScheduleRule('nonsense')).toEqual({ mode: 'weekdays' })
  })
})

describe('parseSpecialDates kinds', () => {
  it('needs hours for an added date, and keeps a closed entry with ranges', () => {
    expect(server.parseSpecialDates([{ from: '2026-03-10', kind: 'open', hours: null }], '2026-03-01')).toHaveProperty('error')
    expect(
      server.parseSpecialDates([{ from: '2026-03-10', kind: 'closed', hours: day('12:00', '14:00') }], '2026-03-01')
    ).toEqual({ value: [{ from: '2026-03-10', to: '2026-03-10', kind: 'closed', hours: day('12:00', '14:00') }] })
  })
})

describe('parseServiceAvailability extras', () => {
  it('keeps per-day hours only for listed weekdays, and the upcoming exceptions', () => {
    expect(
      server.parseServiceAvailability(
        {
          mode: 'weekdays',
          days: ['monday'],
          hoursByDay: { monday: [{ start: '09:00', end: '12:00' }], friday: [{ start: '09:00', end: '12:00' }] },
          exceptions: [
            { from: '2026-03-20', kind: 'closed' },
            { from: '2026-02-01', kind: 'open' },
          ],
        },
        '2026-03-01'
      )
    ).toEqual({
      value: {
        mode: 'weekdays',
        days: ['monday'],
        hoursByDay: { monday: [{ start: '09:00', end: '12:00' }] },
        exceptions: [{ from: '2026-03-20', to: '2026-03-20', kind: 'closed' }],
      },
    })
  })

  it('reads month days with the last day and the short-month switch', () => {
    expect(server.parseServiceAvailability({ mode: 'monthDays', days: [], lastDay: true }, '2026-03-01')).toEqual({
      value: { mode: 'monthDays', days: [], lastDay: true },
    })
    expect(server.parseServiceAvailability({ mode: 'monthDays', days: [31], shortMonths: 'last' }, '2026-03-01')).toEqual({
      value: { mode: 'monthDays', days: [31], shortMonths: 'last' },
    })
  })
})
