import { OpeningHoursSpecification } from 'schema-dts'
import { WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS, WEEK_DAYS_LIST } from '@constants/schedule'
import { splitScheduleIntoParts } from '@helpers/schedule'

/**
 * schema.org identifies weekdays by enumeration URL, and schema-dts types the
 * field as that literal union — so this has to be a lookup, not a template string.
 */
const SCHEMA_DAY_OF_WEEK = {
  [WEEK_DAYS.monday]: 'https://schema.org/Monday',
  [WEEK_DAYS.tuesday]: 'https://schema.org/Tuesday',
  [WEEK_DAYS.wednesday]: 'https://schema.org/Wednesday',
  [WEEK_DAYS.thursday]: 'https://schema.org/Thursday',
  [WEEK_DAYS.friday]: 'https://schema.org/Friday',
  [WEEK_DAYS.saturday]: 'https://schema.org/Saturday',
  [WEEK_DAYS.sunday]: 'https://schema.org/Sunday',
} as const satisfies Record<WeekDay, string>

/**
 * Opening hours as one specification per contiguous open range.
 *
 * `splitScheduleIntoParts` subtracts the day's breaks from its availability, so a
 * 09:00–18:00 day with a 13:00–14:00 break emits two ranges rather than one that
 * overstates when the provider can actually be booked.
 */
export const getOpeningHoursLDSchema = (weekSchedule: WeekSchedule): OpeningHoursSpecification[] =>
  WEEK_DAYS_LIST.flatMap((day) =>
    splitScheduleIntoParts(weekSchedule[day]).map((part): OpeningHoursSpecification => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAY_OF_WEEK[day],
      opens: part.start,
      closes: part.end,
    }))
  )
