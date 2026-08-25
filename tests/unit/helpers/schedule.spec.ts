import { describe, expect, it } from 'vitest'
import { day, makeWeekSchedule } from '@test/setup/fixtures'
import { hasWeekScheduleHours, splitScheduleIntoParts } from '@helpers/schedule'

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

  // Regression: `[...breaks]` is a SHALLOW copy, so the merge step's `last.end = …`
  // writes through into the caller's own break objects. Latent corruption under immer
  // drafts, and the reason a second call with the same array can differ from the first.
  // See docs/BACKLOG.md. Update this test when the mutation is fixed.
  it('KNOWN BUG: mutates the caller’s break objects when merging', () => {
    const breaks = [
      { start: '12:00', end: '13:30' },
      { start: '13:00', end: '14:00' },
    ]

    splitScheduleIntoParts(day('09:00', '18:00', breaks))

    expect(breaks[0].end).toBe('14:00')
    expect(breaks[0].end).not.toBe('13:30')
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
