import { WEEK_DAYS } from '@constants/schedule'

export type WeekDay = (typeof WEEK_DAYS)[keyof typeof WEEK_DAYS]
