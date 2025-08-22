import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS, WEEK_DAYS_LIST } from '@constants/schedule'

export const WEEK_DAYS_SELECTION_ADDITIONAL_OPTIONS: { label: string; childFieldNames: WeekDay[] }[] = [
  {
    label: 'All',
    childFieldNames: WEEK_DAYS_LIST,
  },
  {
    label: 'Working days',
    childFieldNames: [WEEK_DAYS.monday, WEEK_DAYS.tuesday, WEEK_DAYS.wednesday, WEEK_DAYS.thursday, WEEK_DAYS.friday],
  },
  {
    label: 'Weekend',
    childFieldNames: [WEEK_DAYS.saturday, WEEK_DAYS.sunday],
  },
]
