import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { at, day, LONG_AGO, makeWeekSchedule, MONDAY, SUNDAY, TUESDAY } from '@test/setup/fixtures'
import {
  countSlotsByDay,
  getSlotsForDate,
  getSlotsForDateRange,
  getVisibleTimeRange,
  getWeekDay,
  groupSlotsByPartOfDay,
} from '@helpers/booking'

describe('getWeekDay', () => {
  // dayjs indexes 0 = Sunday; WEEK_DAYS_LIST is Monday-first. The `(day() + 6) % 7`
  // rotation that bridges them is exactly the kind of thing to pin for all seven days.
  it.each([
    ['2026-03-02', 'monday'],
    ['2026-03-03', 'tuesday'],
    ['2026-03-04', 'wednesday'],
    ['2026-03-05', 'thursday'],
    ['2026-03-06', 'friday'],
    ['2026-03-07', 'saturday'],
    ['2026-03-08', 'sunday'],
  ])('maps %s to %s', (date, expected) => {
    expect(getWeekDay(dayjs(date))).toBe(expected)
  })
})

describe('getVisibleTimeRange', () => {
  const FALLBACK = { min: '09:00:00', max: '18:00:00' }

  it('pads the widest range in the week by an hour each side', () => {
    const schedule = makeWeekSchedule({
      monday: day('10:00', '16:00'),
      thursday: day('09:00', '17:00'),
    })

    expect(getVisibleTimeRange(schedule)).toEqual({ min: '08:00:00', max: '18:00:00' })
  })

  it('clamps to the start of the day rather than going negative', () => {
    expect(getVisibleTimeRange(makeWeekSchedule({ monday: day('00:30', '12:00') })).min).toBe('00:00:00')
  })

  it('clamps to 24:00 rather than overflowing', () => {
    expect(getVisibleTimeRange(makeWeekSchedule({ monday: day('09:00', '23:30') })).max).toBe('24:00:00')
  })

  it('falls back when the schedule is undefined', () => {
    expect(getVisibleTimeRange(undefined)).toEqual(FALLBACK)
  })

  it('falls back when every day is closed', () => {
    expect(getVisibleTimeRange(makeWeekSchedule())).toEqual(FALLBACK)
  })

  it('falls back when a day has a start but no end', () => {
    expect(getVisibleTimeRange(makeWeekSchedule({ monday: day('09:00', '') }))).toEqual(FALLBACK)
  })

  it('falls back on times that fail strict HH:mm parsing', () => {
    expect(getVisibleTimeRange(makeWeekSchedule({ monday: day('9am', 'noon') }))).toEqual(FALLBACK)
  })
})

describe('getSlotsForDate', () => {
  const schedule = makeWeekSchedule({ monday: day('09:00', '12:00') })

  it('steps through availability by the service duration', () => {
    const slots = getSlotsForDate({ weekSchedule: schedule, date: MONDAY, durationMinutes: 60, now: LONG_AGO })

    expect(slots.map((slot) => at(slot.start))).toEqual(['09:00', '10:00', '11:00'])
    expect(at(slots[0].end)).toBe('10:00')
  })

  it('emits a final slot that ends exactly on the boundary', () => {
    const slots = getSlotsForDate({ weekSchedule: schedule, date: MONDAY, durationMinutes: 45, now: LONG_AGO })

    // The bound is `at + duration <= end`, so 11:15–12:00 is offered.
    expect(slots.map((slot) => at(slot.start))).toEqual(['09:00', '09:45', '10:30', '11:15'])
    expect(at(slots.at(-1)!.end)).toBe('12:00')
  })

  it('drops a trailing slot that would overrun the part', () => {
    const slots = getSlotsForDate({ weekSchedule: schedule, date: MONDAY, durationMinutes: 50, now: LONG_AGO })

    // 11:30 + 50 would reach 12:20, past the 12:00 close.
    expect(slots.map((slot) => at(slot.start))).toEqual(['09:00', '09:50', '10:40'])
  })

  it('skips breaks', () => {
    const withBreak = makeWeekSchedule({ monday: day('09:00', '12:00', [{ start: '10:00', end: '11:00' }]) })
    const slots = getSlotsForDate({ weekSchedule: withBreak, date: MONDAY, durationMinutes: 60, now: LONG_AGO })

    expect(slots.map((slot) => at(slot.start))).toEqual(['09:00', '11:00'])
  })

  it('drops slots that are not strictly after `now`', () => {
    const now = new Date('2026-03-02T10:00:00.000Z')
    const slots = getSlotsForDate({ weekSchedule: schedule, date: MONDAY, durationMinutes: 60, now })

    // The 10:00 slot starts exactly at `now` and is excluded, not included.
    expect(slots.map((slot) => at(slot.start))).toEqual(['11:00'])
  })

  it('returns nothing for a day the provider is closed', () => {
    expect(getSlotsForDate({ weekSchedule: schedule, date: TUESDAY, durationMinutes: 60, now: LONG_AGO })).toEqual([])
  })

  it.each([0, -30])('returns nothing for a duration of %i', (durationMinutes) => {
    expect(getSlotsForDate({ weekSchedule: schedule, date: MONDAY, durationMinutes, now: LONG_AGO })).toEqual([])
  })

  it('returns nothing without a schedule', () => {
    expect(getSlotsForDate({ weekSchedule: undefined, date: MONDAY, durationMinutes: 60, now: LONG_AGO })).toEqual([])
  })

  it('returns nothing when the duration exceeds every free part', () => {
    expect(getSlotsForDate({ weekSchedule: schedule, date: MONDAY, durationMinutes: 240, now: LONG_AGO })).toEqual([])
  })
})

describe('getSlotsForDateRange', () => {
  const schedule = makeWeekSchedule({
    monday: day('09:00', '11:00'),
    sunday: day('09:00', '11:00'),
  })

  it('is inclusive of start and exclusive of end', () => {
    const slots = getSlotsForDateRange({
      weekSchedule: schedule,
      start: MONDAY,
      end: TUESDAY,
      durationMinutes: 60,
      now: LONG_AGO,
    })

    expect(slots).toHaveLength(2)
    expect(slots.every((slot) => dayjs(slot.start).format('YYYY-MM-DD') === '2026-03-02')).toBe(true)
  })

  it('spans multiple open days across the week', () => {
    const slots = getSlotsForDateRange({
      weekSchedule: schedule,
      start: MONDAY,
      end: new Date('2026-03-09T00:00:00.000Z'),
      durationMinutes: 60,
      now: LONG_AGO,
    })

    expect(new Set(slots.map((slot) => dayjs(slot.start).format('YYYY-MM-DD')))).toEqual(
      new Set(['2026-03-02', '2026-03-08'])
    )
  })

  it('returns nothing when end precedes start', () => {
    expect(
      getSlotsForDateRange({
        weekSchedule: schedule,
        start: TUESDAY,
        end: MONDAY,
        durationMinutes: 60,
        now: LONG_AGO,
      })
    ).toEqual([])
  })
})

describe('groupSlotsByPartOfDay', () => {
  const slotAt = (iso: string) => ({ start: new Date(iso), end: new Date(iso) })

  it('buckets by hour and drops empty groups', () => {
    const groups = groupSlotsByPartOfDay([slotAt('2026-03-02T09:00:00Z'), slotAt('2026-03-02T18:00:00Z')])

    expect(groups.map((group) => group.key)).toEqual(['morning', 'evening'])
  })

  it.each([
    ['2026-03-02T11:59:00Z', 'morning'],
    ['2026-03-02T12:00:00Z', 'afternoon'],
    ['2026-03-02T16:59:00Z', 'afternoon'],
    ['2026-03-02T17:00:00Z', 'evening'],
  ])('puts %s in %s', (iso, expected) => {
    const [group] = groupSlotsByPartOfDay([slotAt(iso)])
    expect(group.key).toBe(expected)
  })

  it('returns nothing for no slots', () => {
    expect(groupSlotsByPartOfDay([])).toEqual([])
  })
})

describe('countSlotsByDay', () => {
  it('counts per local calendar day', () => {
    const counts = countSlotsByDay([
      { start: new Date('2026-03-02T09:00:00Z'), end: new Date('2026-03-02T10:00:00Z') },
      { start: new Date('2026-03-02T11:00:00Z'), end: new Date('2026-03-02T12:00:00Z') },
      { start: new Date('2026-03-03T09:00:00Z'), end: new Date('2026-03-03T10:00:00Z') },
    ])

    expect(counts.get('2026-03-02')).toBe(2)
    expect(counts.get('2026-03-03')).toBe(1)
  })

  it('returns an empty map for no slots', () => {
    expect(countSlotsByDay([]).size).toBe(0)
  })

  it('is keyed by SUNDAY as a plain date, not a weekday name', () => {
    expect([...countSlotsByDay([{ start: SUNDAY, end: SUNDAY }]).keys()]).toEqual(['2026-03-08'])
  })
})
