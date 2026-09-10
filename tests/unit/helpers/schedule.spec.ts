import { describe, expect, it } from 'vitest'
import { day, makeWeekSchedule } from '@test/setup/fixtures'
import { hasWeekScheduleHours, rangesToDaySchedule, splitScheduleIntoParts } from '@helpers/schedule'

describe('splitScheduleIntoParts', () => {
  it('returns the whole availability when there are no breaks', () => {
    expect(splitScheduleIntoParts(day('09:00', '17:00'))).toEqual([{ start: '09:00', end: '17:00' }])
  })

  it('splits around a single break', () => {
    expect(splitScheduleIntoParts(day('09:00', '18:00', [{ start: '13:00', end: '14:00' }]))).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ])
  })

  it('merges overlapping breaks', () => {
    const parts = splitScheduleIntoParts(
      day('09:00', '18:00', [
        { start: '12:00', end: '13:30' },
        { start: '13:00', end: '14:00' },
      ])
    )

    expect(parts).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ])
  })

  it('sorts breaks before merging, so input order does not matter', () => {
    const ordered = splitScheduleIntoParts(
      day('09:00', '18:00', [
        { start: '10:00', end: '10:30' },
        { start: '15:00', end: '15:30' },
      ])
    )
    const reversed = splitScheduleIntoParts(
      day('09:00', '18:00', [
        { start: '15:00', end: '15:30' },
        { start: '10:00', end: '10:30' },
      ])
    )

    expect(reversed).toEqual(ordered)
  })

  it('suppresses the leading part when a break starts before availability', () => {
    expect(splitScheduleIntoParts(day('09:00', '17:00', [{ start: '08:00', end: '10:00' }]))).toEqual([
      { start: '10:00', end: '17:00' },
    ])
  })

  it('returns nothing when a break covers the whole day', () => {
    expect(splitScheduleIntoParts(day('09:00', '17:00', [{ start: '09:00', end: '17:00' }]))).toEqual([])
  })

  it('returns nothing when the day is closed', () => {
    expect(splitScheduleIntoParts(day('', ''))).toEqual([])
  })

  it('returns nothing when end precedes start', () => {
    expect(splitScheduleIntoParts(day('17:00', '09:00'))).toEqual([])
  })

  it('does not merge breaks that merely touch', () => {
    expect(
      splitScheduleIntoParts(
        day('09:00', '18:00', [
          { start: '12:00', end: '13:00' },
          { start: '13:00', end: '14:00' },
        ])
      )
    ).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ])
  })

  // `[...breaks]` is only a SHALLOW copy, so the merge step's `last.end = …` used to write
  // through into the caller's own break objects — a frozen-object throw under an immer
  // draft, and silent corruption everywhere else. Fixed by copying each break into the
  // accumulator; this pins that the input is left alone.
  it('leaves the caller’s break objects untouched when merging', () => {
    const breaks = [
      { start: '12:00', end: '13:30' },
      { start: '13:00', end: '14:00' },
    ]

    splitScheduleIntoParts(day('09:00', '18:00', breaks))

    expect(breaks).toEqual([
      { start: '12:00', end: '13:30' },
      { start: '13:00', end: '14:00' },
    ])
  })

  // The merge itself must still happen — the fix copies the input, it does not stop
  // overlapping breaks from collapsing into one.
  it('still merges overlapping breaks into a single gap', () => {
    const parts = splitScheduleIntoParts(
      day('09:00', '18:00', [
        { start: '12:00', end: '13:30' },
        { start: '13:00', end: '14:00' },
      ])
    )

    expect(parts).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ])
  })

  // Calling twice with the same array used to differ, because the first call rewrote the
  // input the second one then read.
  it('is repeatable against the same input array', () => {
    const breaks = [
      { start: '12:00', end: '13:30' },
      { start: '13:00', end: '14:00' },
    ]
    const schedule = day('09:00', '18:00', breaks)

    expect(splitScheduleIntoParts(schedule)).toEqual(splitScheduleIntoParts(schedule))
  })
})

describe('rangesToDaySchedule', () => {
  it('returns a closed day when there are no valid ranges', () => {
    expect(rangesToDaySchedule([])).toEqual({ availability: { start: '', end: '' }, breaks: [] })
    expect(rangesToDaySchedule([{ start: '17:00', end: '09:00' }])).toEqual({
      availability: { start: '', end: '' },
      breaks: []
    })
  })

  it('stores a single window with no breaks', () => {
    expect(rangesToDaySchedule([{ start: '09:00', end: '17:00' }])).toEqual({
      availability: { start: '09:00', end: '17:00' },
      breaks: [],
    })
  })

  it('persists the gap between two windows as a break', () => {
    expect(
      rangesToDaySchedule([
        { start: '09:00', end: '12:00' },
        { start: '13:00', end: '17:00' },
      ])
    ).toEqual({
      availability: { start: '09:00', end: '17:00' },
      breaks: [{ start: '12:00', end: '13:00' }],
    })
  })

  it('merges overlapping or touching windows', () => {
    expect(
      rangesToDaySchedule([
        { start: '09:00', end: '12:00' },
        { start: '11:30', end: '14:00' },
        { start: '14:00', end: '17:00' },
      ])
    ).toEqual({
      availability: { start: '09:00', end: '17:00' },
      breaks: [],
    })
  })

  it('caps at five windows', () => {
    const ranges = [
      { start: '08:00', end: '09:00' },
      { start: '10:00', end: '11:00' },
      { start: '12:00', end: '13:00' },
      { start: '14:00', end: '15:00' },
      { start: '16:00', end: '17:00' },
      { start: '18:00', end: '19:00' },
    ]
    const result = rangesToDaySchedule(ranges)

    expect(result.availability).toEqual({ start: '08:00', end: '17:00' })
    expect(result.breaks).toHaveLength(4)
    expect(splitScheduleIntoParts({
      availability: { ...result.availability },
      breaks: result.breaks.map((brk) => ({ ...brk })),
    })).toHaveLength(5)
  })
})

describe('hasWeekScheduleHours', () => {
  it('is false for a schedule of empty strings', () => {
    expect(hasWeekScheduleHours(makeWeekSchedule())).toBe(false)
  })

  it('is true when any single day is open', () => {
    expect(hasWeekScheduleHours(makeWeekSchedule({ wednesday: day('10:00', '12:00') }))).toBe(true)
  })

  it('is false when every open day is fully consumed by breaks', () => {
    const schedule = makeWeekSchedule({ monday: day('09:00', '17:00', [{ start: '09:00', end: '17:00' }]) })
    expect(hasWeekScheduleHours(schedule)).toBe(false)
  })
})
