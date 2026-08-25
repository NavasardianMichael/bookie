import { DaySchedule, WeekSchedule } from '@store/providers/profile/types'
import { WEEK_DAYS_LIST } from '@constants/schedule'

/** A day with no hours — what a profile created without a schedule looks like. */
export const CLOSED_DAY: DaySchedule = { availability: { start: '', end: '' }, breaks: [] }

export const day = (start: string, end: string, breaks: { start: string; end: string }[] = []): DaySchedule => ({
  availability: { start, end },
  breaks,
})

/**
 * A full week, closed by default. Pass only the days under test:
 *
 *   makeWeekSchedule({ monday: day('09:00', '17:00') })
 */
export const makeWeekSchedule = (overrides: Partial<Record<(typeof WEEK_DAYS_LIST)[number], DaySchedule>> = {}) =>
  WEEK_DAYS_LIST.reduce((acc, weekDay) => {
    acc[weekDay] = overrides[weekDay] ?? { ...CLOSED_DAY, breaks: [] }
    return acc
  }, {} as WeekSchedule)

/** `HH:mm` of a Date, in the pinned UTC zone. */
export const at = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

/** 2026-03-02 is a Monday. Anchoring on it keeps weekday-dependent tests readable. */
export const MONDAY = new Date('2026-03-02T00:00:00.000Z')
export const TUESDAY = new Date('2026-03-03T00:00:00.000Z')
export const SUNDAY = new Date('2026-03-08T00:00:00.000Z')

/** Well before any slot under test, so nothing is filtered as "past". */
export const LONG_AGO = new Date('2020-01-01T00:00:00.000Z')
