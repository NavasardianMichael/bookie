export const WEEK_DAYS = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
} as const

export const WEEK_DAYS_LIST = Object.values(WEEK_DAYS)

/** How schedule times are persisted and parsed. Always 24-hour. */
export const SCHEDULE_VALUE_FORMAT = 'HH:mm'

/** How schedule times are shown in pickers. Keeps the meridiem so 12-hour input is unambiguous. */
export const SCHEDULE_DISPLAY_FORMAT = 'hh:mm A'

/** Keys a calendar day in lookup maps (slot counts, day-cell affordances). */
export const DAY_KEY_FORMAT = 'YYYY-MM-DD'
