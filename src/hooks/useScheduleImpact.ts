import { useCallback } from 'react'
import { getProviderBookingsAPI } from '@api/appointments/main'
import { ProviderBooking, ProviderBookingsQuery } from '@api/appointments/types'
import { ProviderScheduleRule, ProviderService, SpecialDate, WeekSchedule } from '@store/providers/profile/types'
import { ScheduleImpact, scheduleImpact } from '@helpers/scheduleConflicts'
import { dayKeyOf, inTimeZone } from '@helpers/timeZone'

/** How far ahead upcoming bookings are checked against new hours, read a page at a time. */
const IMPACT_DAYS = 90
const IMPACT_PAGE_SIZE = 100

type Hours = { weekSchedule?: WeekSchedule; specialDates?: SpecialDate[]; rule?: ProviderScheduleRule }

/**
 * Every live booking in the window, all pages: the first page says how many there are, the rest
 * are read together. A booking made between two reads can shift a page, so rows are kept by id.
 */
const readLiveBookings = async (from: string, to: string): Promise<ProviderBooking[]> => {
  const query: ProviderBookingsQuery = {
    from,
    to,
    status: ['pending', 'scheduled', 'confirmed'],
    sort: 'startAsc',
    perPage: IMPACT_PAGE_SIZE,
  }
  const first = await getProviderBookingsAPI({ ...query, page: 1 })
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.pageCount - 1) }, (_, index) =>
      getProviderBookingsAPI({ ...query, page: index + 2 })
    )
  )
  const byId = new Map<string, ProviderBooking>()
  ;[first, ...rest].forEach(({ items }) => items.forEach((booking) => byId.set(booking.id, booking)))
  return [...byId.values()]
}

/**
 * Checks a schedule about to change against what depends on it (`scheduleImpact`): the
 * provider's services, and every live booking in the next 90 days, read fresh. Rejects when the
 * bookings cannot be read — the caller shows that, rather than going ahead as if nothing were
 * affected.
 */
export const useScheduleImpact = (): ((input: {
  before: Hours
  after: Hours
  services: ProviderService[]
  timeZone?: string
}) => Promise<ScheduleImpact>) =>
  useCallback(async ({ before, after, services, timeZone }) => {
    const now = new Date()
    const items = await readLiveBookings(
      now.toISOString(),
      new Date(now.getTime() + IMPACT_DAYS * 86_400_000).toISOString()
    )
    return scheduleImpact({
      before,
      after,
      services,
      bookings: items.map((booking) => ({
        id: booking.id,
        start: booking.time.startDate,
        end: booking.time.endDate,
        serviceName: booking.service.name,
        clientName: booking.booker.fullName,
      })),
      todayKey: dayKeyOf(now, timeZone),
      dayAndMinutes: (iso) => {
        const clock = inTimeZone(iso, timeZone)
        return { dayKey: clock.format('YYYY-MM-DD'), minutes: clock.hour() * 60 + clock.minute() }
      },
    })
  }, [])
