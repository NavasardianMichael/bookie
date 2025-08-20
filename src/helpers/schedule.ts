import dayjs from 'dayjs'
import minMax from 'dayjs/plugin/minMax'
import { DaySchedule, DaySchedulePart } from '@store/providers/profile/types'

/**
 * Returns the available parts (availability - breaks).
 * Uses dayjs for time comparison.
 */
dayjs.extend(minMax)
export function splitScheduleIntoParts(schedule: DaySchedule): DaySchedulePart[] {
  const { availability, breaks } = schedule

  const availabilityStart = dayjs(availability.start, 'HH:mm')
  const availabilityEnd = dayjs(availability.end, 'HH:mm')

  // Sort breaks and merge overlapping ones
  const mergedBreaks = [...breaks]
    .sort((a, b) => dayjs(a.start, 'HH:mm').diff(dayjs(b.start, 'HH:mm')))
    .reduce<DaySchedulePart[]>((acc, brk) => {
      const last = acc[acc.length - 1]
      if (!last) return [brk]

      const lastEnd = dayjs(last.end, 'HH:mm')
      const brkStart = dayjs(brk.start, 'HH:mm')
      const brkEnd = dayjs(brk.end, 'HH:mm')

      if (brkStart.isBefore(lastEnd)) {
        // Overlapping → merge into last
        last.end = dayjs.max(lastEnd, brkEnd).format('HH:mm')
        return acc
      }
      acc.push(brk)
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
