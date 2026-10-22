import { Dayjs } from 'dayjs'
import { TIME_FORMATS, WEEK_DAYS } from '@constants/schedule'

export type WeekDay = (typeof WEEK_DAYS)[keyof typeof WEEK_DAYS]

/** `details.timeFormat` — mirrors the Prisma `TimeFormat` enum. */
export type TimeFormat = (typeof TIME_FORMATS)[keyof typeof TIME_FORMATS]

/**
 * One bookable window as the availability editor holds it — `Dayjs` for antd's `TimePicker`.
 * Absent while a picker is cleared.
 */
export type ScheduleRangeForm = {
  start?: Dayjs | null
  end?: Dayjs | null
}

/** One weekday in the availability editor: open or not, and its windows. */
export type ScheduleDayForm = {
  open: boolean
  ranges: ScheduleRangeForm[]
}

/** The availability editor's week — the Availability tab's and the profile assistant's. */
export type ScheduleDaysForm = Record<WeekDay, ScheduleDayForm>
