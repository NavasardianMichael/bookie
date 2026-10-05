import { TIME_FORMATS, WEEK_DAYS } from '@constants/schedule'

export type WeekDay = (typeof WEEK_DAYS)[keyof typeof WEEK_DAYS]

/** `details.timeFormat` — mirrors the Prisma `TimeFormat` enum. */
export type TimeFormat = (typeof TIME_FORMATS)[number]
