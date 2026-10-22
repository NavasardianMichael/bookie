import { describe, expect, it } from 'vitest'
import { day, LONG_AGO, makeWeekSchedule } from '@test/setup/fixtures'
import {
  checkDraftSlot,
  draftInterval,
  draftMonths,
  draftMonthWindow,
  DraftSchedule,
  DraftSlotRow,
  draftStart,
  draftTimeOptions,
} from '@helpers/bookingImport'

// 2026-03-02 is a Monday (`MONDAY` in the fixtures). Monday 09:00–12:00 with a 10:00–10:30
// break, in Yerevan (UTC+4, no DST) — so 09:00 there is 05:00Z.
const schedule: DraftSchedule = {
  weekSchedule: makeWeekSchedule({ monday: day('09:00', '12:00', [{ start: '10:00', end: '10:30' }]) }),
  timeZone: 'Asia/Yerevan',
  durations: { cut: 30, colour: 60 },
}

const row = (time: string, serviceId = 'cut', date = '2026-03-02') => ({ serviceId, date, time })

const check = (rows: DraftSlotRow[], index = 0, busy: { startAt: string; endAt: string }[] = [], now = LONG_AGO) =>
  checkDraftSlot({ rows, index, schedule, busy, now })

describe('draftStart', () => {
  it("reads the wall-clock time in the provider's zone", () => {
    expect(draftStart(row('09:30'), 'Asia/Yerevan')?.toISOString()).toBe('2026-03-02T05:30:00.000Z')
  })

  it('is null until both date and time are readable', () => {
    expect(draftStart({ date: '2026-03-02' }, 'Asia/Yerevan')).toBeNull()
    expect(draftStart(row('9.30'), 'Asia/Yerevan')).toBeNull()
    expect(draftStart(row('09:30', 'cut', '2026-02-30'), 'Asia/Yerevan')).toBeNull()
  })

  it('spans the service', () => {
    expect(draftInterval(row('11:00', 'colour'), schedule)).toEqual({
      startAt: '2026-03-02T07:00:00.000Z',
      endAt: '2026-03-02T08:00:00.000Z',
    })
  })
})

describe('checkDraftSlot', () => {
  it('passes a free slot on the grid', () => {
    expect(check([row('09:30')])).toBeNull()
  })

  it('asks for whatever is missing first', () => {
    expect(check([{ serviceId: 'cut', date: '2026-03-02', time: null }])).toEqual({ issue: 'missing' })
    expect(check([row('09:30', 'withdrawn-service')])).toEqual({ issue: 'missing' })
  })

  it.each([
    ['between two slot starts', row('09:10')],
    ['in the break', row('10:00')],
    ['before opening', row('08:30')],
    ['running past closing', row('11:30', 'colour')],
    ['on a closed day', row('09:00', 'cut', '2026-03-03')],
  ])('flags a time %s as off the grid', (_label, draft) => {
    expect(check([draft])).toEqual({ issue: 'offGrid' })
  })

  // The grid restarts after the break, on the break's end — 10:30, 11:00, 11:30 for `cut`.
  it('follows the grid as it restarts after a break', () => {
    expect(check([row('10:30')])).toBeNull()
  })

  it('tells a past slot apart from an off-grid one', () => {
    expect(check([row('09:00')], 0, [], new Date('2026-03-02T05:15:00.000Z'))).toEqual({ issue: 'past' })
  })

  it('flags a slot that overlaps a booking already on the calendar', () => {
    const busy = [{ startAt: '2026-03-02T05:15:00.000Z', endAt: '2026-03-02T05:45:00.000Z' }]
    expect(check([row('09:30')], 0, busy)).toEqual({ issue: 'taken' })
  })

  it('lets a slot touch a booking without overlapping it', () => {
    const busy = [{ startAt: '2026-03-02T05:00:00.000Z', endAt: '2026-03-02T05:30:00.000Z' }]
    expect(check([row('09:30')], 0, busy)).toBeNull()
  })

  it('flags only the later of two clashing rows, naming the earlier', () => {
    // `colour` (60 min) fits after the break only at 10:30, and runs into `cut` at 11:00.
    const rows = [row('10:30', 'colour'), row('11:00')]
    expect(check(rows, 0)).toBeNull()
    expect(check(rows, 1)).toEqual({ issue: 'clash', clashWith: 0 })
  })

  // A misread row (here off the grid) must not make the row read right look wrong.
  it('does not flag an earlier row for a later one that overlaps it', () => {
    const rows = [row('09:00'), row('09:10')]
    expect(check(rows, 0)).toBeNull()
    expect(check(rows, 1)).toEqual({ issue: 'offGrid' })
  })
})

/**
 * A service offered on some days only (`ServiceAvailability`). The provider is open on
 * Monday 2026-03-02, but `wednesdays` runs on Wednesdays — which they are closed on, so it
 * can never be booked — and `mondays` on Mondays. Blocked like the public grid, and told
 * apart from `offGrid` because the fix is another date.
 */
describe('checkDraftSlot with a service offered on some days', () => {
  const withRules: DraftSchedule = {
    ...schedule,
    durations: { ...schedule.durations, mondays: 30, wednesdays: 30 },
    availability: {
      mondays: { mode: 'weekdays', days: ['monday'] },
      wednesdays: { mode: 'weekdays', days: ['wednesday'] },
    },
  }
  const checkWith = (rows: DraftSlotRow[]) => checkDraftSlot({ rows, index: 0, schedule: withRules, busy: [], now: LONG_AGO })

  it('flags a day the provider is open but the service is not offered', () => {
    expect(checkWith([row('09:30', 'wednesdays')])).toEqual({ issue: 'serviceClosed' })
  })

  it('passes a slot on a day the service is offered', () => {
    expect(checkWith([row('09:30', 'mondays')])).toBeNull()
  })

  // A closed provider day stays `offGrid`: no service could fix it, only a different day.
  it('keeps a day the provider is closed as off the grid', () => {
    expect(checkWith([row('09:00', 'mondays', '2026-03-03')])).toEqual({ issue: 'offGrid' })
  })

  it('offers no times on a day the service is not offered', () => {
    expect(
      draftTimeOptions({ rows: [row('09:30', 'wednesdays')], index: 0, schedule: withRules, busy: [], now: LONG_AGO })
    ).toEqual([])
  })
})

describe('draftTimeOptions', () => {
  it("offers the service's free slots on the provider's clock, minus the calendar and the other rows", () => {
    const busy = [{ startAt: '2026-03-02T05:00:00.000Z', endAt: '2026-03-02T05:30:00.000Z' }] // 09:00
    const rows = [row('09:30'), row('11:00')]
    expect(draftTimeOptions({ rows, index: 0, schedule, busy, now: LONG_AGO })).toEqual(['09:30', '10:30', '11:30'])
  })

  it('drops slots already past', () => {
    expect(
      draftTimeOptions({ rows: [row('11:30')], index: 0, schedule, busy: [], now: new Date('2026-03-02T06:45:00.000Z') })
    ).toEqual(['11:00', '11:30'])
  })

  it('offers nothing until a service and a day are chosen', () => {
    expect(draftTimeOptions({ rows: [{ date: '2026-03-02' }], index: 0, schedule, busy: [], now: LONG_AGO })).toEqual([])
  })
})

describe('the busy windows', () => {
  it('needs one read per month the rows fall in', () => {
    expect(draftMonths([row('09:00', 'cut', '2026-04-01'), row('09:00'), { date: null }, row('09:30')])).toEqual([
      '2026-03',
      '2026-04',
    ])
  })

  it('pads each month by a day either side', () => {
    expect(draftMonthWindow('2026-03')).toEqual({
      from: '2026-02-28T00:00:00.000Z',
      to: '2026-04-02T00:00:00.000Z',
    })
  })
})
