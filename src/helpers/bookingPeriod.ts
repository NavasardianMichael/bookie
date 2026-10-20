import dayjs, { Dayjs } from 'dayjs'

/** Preset ranges for the bookings list. Weeks are Monday-first, matching the calendar. */
export const BOOKING_PERIODS = ['upcoming', 'today', 'thisWeek', 'nextWeek', 'lastWeek', 'thisMonth', 'lastMonth'] as const

export type BookingPeriod = (typeof BOOKING_PERIODS)[number]

export type BookingPeriodRange = { from: string; to?: string }

/** Monday 00:00 of the week that contains `now`. Sunday belongs to the week that just ended. */
const mondayOf = (now: Dayjs): Dayjs => {
  const start = now.startOf('day')
  const weekday = start.day()
  return start.add(weekday === 0 ? -6 : 1 - weekday, 'day')
}

const throughSunday = (monday: Dayjs): BookingPeriodRange => ({
  from: monday.toISOString(),
  to: monday.add(6, 'day').endOf('day').toISOString(),
})

/**
 * Inclusive instant range for a preset, in the runtime's local zone — the same clock the
 * calendar day filter uses. `upcoming` starts now and has no end.
 */
export const bookingPeriodRange = (period: BookingPeriod, now: Dayjs = dayjs()): BookingPeriodRange => {
  const today = now.startOf('day')
  const thisMonday = mondayOf(now)

  switch (period) {
    case 'upcoming':
      return { from: now.toISOString() }
    case 'today':
      return { from: today.toISOString(), to: today.endOf('day').toISOString() }
    case 'thisWeek':
      return throughSunday(thisMonday)
    case 'nextWeek':
      return throughSunday(thisMonday.add(7, 'day'))
    case 'lastWeek':
      return throughSunday(thisMonday.subtract(7, 'day'))
    case 'thisMonth':
      return { from: today.startOf('month').toISOString(), to: today.endOf('month').toISOString() }
    case 'lastMonth': {
      const previous = today.subtract(1, 'month')
      return { from: previous.startOf('month').toISOString(), to: previous.endOf('month').toISOString() }
    }
  }
}
