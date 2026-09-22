import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { at, day, LONG_AGO, makeWeekSchedule, MONDAY, SUNDAY, TUESDAY } from '@test/setup/fixtures'
import {
  countSlotsByDay,
  dropBusySlots,
  getSlotsForDate,
  getSlotsForDateRange,
  getWeekDay,
  isOpenOnDate,
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

describe('isOpenOnDate', () => {
  const schedule = makeWeekSchedule({ monday: day('09:00', '11:00') })

  it('is true on a weekday with hours', () => {
    expect(isOpenOnDate(schedule, MONDAY)).toBe(true)
  })

  it('is false on a closed weekday', () => {
    expect(isOpenOnDate(schedule, TUESDAY)).toBe(false)
  })

  it('is false without a schedule', () => {
    expect(isOpenOnDate(undefined, MONDAY)).toBe(false)
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

/**
 * The half of the booking grid that did not exist until now.
 *
 * `getSlotsForDate` answers "when is this provider open", and `BookingPanel` rendered
 * that as if it meant "when can I book" — so every visitor saw every in-hours time as
 * free and learned otherwise from a 409 on submit (`docs/BACKLOG.md` #6). These cases
 * are the overlap arithmetic that closes it.
 */
describe('dropBusySlots', () => {
  const slotAt = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) })

  const slots = [
    slotAt('2026-03-02T09:00:00Z', '2026-03-02T10:00:00Z'),
    slotAt('2026-03-02T10:00:00Z', '2026-03-02T11:00:00Z'),
    slotAt('2026-03-02T11:00:00Z', '2026-03-02T12:00:00Z'),
  ]

  it('returns the slots untouched when nothing is booked', () => {
    expect(dropBusySlots(slots, [])).toEqual(slots)
  })

  it('drops a slot a booking sits exactly on', () => {
    const remaining = dropBusySlots(slots, [
      { startAt: '2026-03-02T10:00:00Z', endAt: '2026-03-02T11:00:00Z' },
    ])

    expect(remaining.map((slot) => at(slot.start))).toEqual(['09:00', '11:00'])
  })

  /**
   * The case that makes this overlap arithmetic rather than a start-time lookup. A
   * 45-minute booking at 09:30 sits on no slot boundary at all, and comparing starts
   * would offer both hours it eats into.
   */
  it('drops every slot a booking overlaps, boundaries included', () => {
    const remaining = dropBusySlots(slots, [
      { startAt: '2026-03-02T09:30:00Z', endAt: '2026-03-02T10:15:00Z' },
    ])

    expect(remaining.map((slot) => at(slot.start))).toEqual(['11:00'])
  })

  // Half-open intervals: a booking that ends exactly when a slot starts does not touch
  // it. Getting this wrong loses a bookable hour after every appointment.
  it('keeps a slot that merely abuts a booking', () => {
    const remaining = dropBusySlots(slots, [
      { startAt: '2026-03-02T08:00:00Z', endAt: '2026-03-02T09:00:00Z' },
    ])

    expect(remaining).toHaveLength(3)
  })

  it('handles a long booking spanning several slots', () => {
    expect(dropBusySlots(slots, [{ startAt: '2026-03-02T08:00:00Z', endAt: '2026-03-02T13:00:00Z' }])).toEqual([])
  })

  /**
   * An unparseable instant compares `NaN` against everything and would silently keep
   * every slot bookable — the one outcome worse than dropping too many, because it is
   * exactly the false "this is free" this function exists to stop.
   */
  it('ignores an unusable interval rather than letting it match nothing', () => {
    const remaining = dropBusySlots(slots, [
      { startAt: 'not-a-date', endAt: '2026-03-02T10:00:00Z' },
      // Zero-length and inverted intervals cannot take a slot either.
      { startAt: '2026-03-02T09:00:00Z', endAt: '2026-03-02T09:00:00Z' },
      { startAt: '2026-03-02T12:00:00Z', endAt: '2026-03-02T11:00:00Z' },
    ])

    expect(remaining).toEqual(slots)
  })
})
