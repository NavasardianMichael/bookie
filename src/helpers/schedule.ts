import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import minMax from 'dayjs/plugin/minMax'
import { DaySchedule, DaySchedulePart, WeekSchedule } from '@store/providers/profile/types'
import { MAX_DAY_RANGES, WEEK_DAYS_LIST } from '@constants/schedule'

/**
 * Returns the available parts (availability - breaks).
 * Uses dayjs for time comparison.
 */
// customParseFormat is required for `dayjs('09:00', 'HH:mm')`. Without it dayjs
// ignores the format string and falls back to `new Date('09:00')` — an Invalid
// Date — so every comparison below silently returns an empty schedule.
dayjs.extend(customParseFormat)
dayjs.extend(minMax)
export function splitScheduleIntoParts(schedule: DaySchedule): DaySchedulePart[] {
  const { availability, breaks } = schedule

  const availabilityStart = dayjs(availability.start, 'HH:mm')
  const availabilityEnd = dayjs(availability.end, 'HH:mm')

  // Sort breaks and merge overlapping ones.
  //
  // Each break is **copied** into the accumulator, not pushed by reference. `[...breaks]`
  // is only a shallow copy, so the objects inside it still belong to the caller — and the
  // merge below assigns `last.end`, which would write straight through into the schedule
  // that was passed in. Under an immer draft that is a frozen-object throw; everywhere
  // else it is silent corruption of the caller's state.
  const mergedBreaks = [...breaks]
    .sort((a, b) => dayjs(a.start, 'HH:mm').diff(dayjs(b.start, 'HH:mm')))
    .reduce<DaySchedulePart[]>((acc, brk) => {
      const last = acc[acc.length - 1]
      if (!last) return [{ ...brk }]

      const lastEnd = dayjs(last.end, 'HH:mm')
      const brkStart = dayjs(brk.start, 'HH:mm')
      const brkEnd = dayjs(brk.end, 'HH:mm')

      if (brkStart.isBefore(lastEnd)) {
        // Overlapping → merge into last, which is ours to mutate.
        last.end = dayjs.max(lastEnd, brkEnd).format('HH:mm')
        return acc
      }
      acc.push({ ...brk })
      return acc
    }, [])

  const result: DaySchedulePart[] = []
  let currentStart = availabilityStart

  for (const brk of mergedBreaks) {
    const brkStart = dayjs(brk.start, 'HH:mm')
    const brkEnd = dayjs(brk.end, 'HH:mm')

    // If break starts after currentStart, push free slot
    if (brkStart.isAfter(currentStart)) {
      result.push({
        start: currentStart.format('HH:mm'),
        end: brkStart.format('HH:mm'),
      })
    }

    // Move currentStart forward if break ends later
    if (brkEnd.isAfter(currentStart)) {
      currentStart = brkEnd
    }
  }

  // Add last part if still within availability
  if (currentStart.isBefore(availabilityEnd)) {
    result.push({
      start: currentStart.format('HH:mm'),
      end: availabilityEnd.format('HH:mm'),
    })
  }

  return result
}

const EMPTY_DAY: DaySchedule = { availability: { start: '', end: '' }, breaks: [] }

/**
 * Inverse of `splitScheduleIntoParts`: bookable windows → one outer availability
 * plus the gaps as breaks. Overlapping or touching ranges merge. Caps at
 * `MAX_DAY_RANGES` so a day cannot grow past what the availability UI allows.
 */
export const rangesToDaySchedule = (ranges: DaySchedulePart[]): DaySchedule => {
  const valid = ranges
    .filter((range) => range.start && range.end && range.start < range.end)
    .sort((left, right) => left.start.localeCompare(right.start))

  if (!valid.length) return { ...EMPTY_DAY, breaks: [] }

  const merged: DaySchedulePart[] = []
  valid.forEach((range) => {
    const last = merged[merged.length - 1]
    if (!last || range.start > last.end) {
      merged.push({ ...range })
      return
    }
    if (range.end > last.end) last.end = range.end
  })

  const capped = merged.slice(0, MAX_DAY_RANGES)
  const first = capped[0]!
  const last = capped[capped.length - 1]!
  const breaks: DaySchedulePart[] = []

  for (let index = 0; index < capped.length - 1; index += 1) {
    const current = capped[index]!
    const next = capped[index + 1]!
    if (current.end < next.start) {
      breaks.push({ start: current.end, end: next.start })
    }
  }

  return { availability: { start: first.start, end: last.end }, breaks }
}

/**
 * Whether the provider is open at all in the week.
 *
 * A profile created without a schedule has every day set to empty strings, so the
 * "Working hours" section and its structured data must both be suppressed rather
 * than render seven "Closed" rows.
 */
export const hasWeekScheduleHours = (weekSchedule: WeekSchedule): boolean =>
  WEEK_DAYS_LIST.some((day) => splitScheduleIntoParts(weekSchedule[day]).length > 0)
