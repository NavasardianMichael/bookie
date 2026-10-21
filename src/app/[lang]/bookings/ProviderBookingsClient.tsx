'use client'

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { getProviderBookingsCalendarAPI, getProviderConsumerBookingsCalendarAPI } from '@api/appointments/main'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { BookingPeriod, bookingPeriodRange } from '@helpers/bookingPeriod'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { BookingsList, BookingsSide } from './BookingsList'
import { DayBookingCount, ProviderBookingsCalendar } from './ProviderBookingsCalendar'

type Props = {
  side: BookingsSide
  /** Bumped by the page when bookings arrive from outside this panel (a photo import). */
  importRevision?: number
}

/**
 * A provider's bookings: a month calendar over History's filtered, sorted, paged list.
 *
 * `side` is which identity the list is for. `'provider'` is appointments booked *with*
 * this professional; `'consumer'` is appointments they booked with someone else. Both are
 * views of `/bookings`, picked by the page's switch (`BookingsClient`), and share this
 * panel so the calendar, the filters and the kebab stay one implementation. The page owns
 * the heading, because it names the whole page rather than one view of it.
 *
 * **Filter state is local, not in the URL** — the opposite of Explore, and for a reason
 * that does not apply here. Explore's grid is a Server Component, so its query has to
 * survive a round-trip whatever happens; putting it in the address bar costs nothing and
 * buys a shareable result set. This panel is a client island that fetches for itself, so
 * URL state would add a server round-trip to every filter change in exchange for a
 * shareable link to a page only its owner can open.
 *
 * **The day filter and the calendar are one control.** Selecting a day narrows the list
 * to it; selecting it again clears. There is no separate date-range picker, because two
 * controls writing one piece of state is how they end up disagreeing.
 */
export const ProviderBookingsClient: FC<Props> = ({ side, importRevision = 0 }) => {
  const isConsumer = side === 'consumer'
  const tErrors = useTranslations('Errors')
  const [calendarOpen, setCalendarOpen] = useState(true)

  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'))
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  // Upcoming, not the whole history: the list should open on what is still ahead.
  const [period, setPeriod] = useState<BookingPeriod | null>('upcoming')
  const [countsByDay, setCountsByDay] = useState<Record<string, DayBookingCount>>({})
  const [revision, setRevision] = useState(0)
  /** The calendar's own Retry — separate from `revision`, which reloads the list too. */
  const [calendarAttempt, setCalendarAttempt] = useState(0)
  const [calendarError, setCalendarError] = useState<unknown>(null)

  const monthKey = month.format('YYYY-MM')
  // One counter for both causes of a re-read: a status written here, bookings added above.
  const listRevision = revision + importRevision

  /**
   * The day filter as an inclusive instant range. Sent as a whole local day rather than
   * a bare date so the server, which compares UTC instants, keeps the same day the
   * provider clicked.
   */
  const dayRange = useMemo(() => {
    if (selectedDayKey) {
      const day = dayjs(selectedDayKey, DAY_KEY_FORMAT)
      return { from: day.startOf('day').toISOString(), to: day.endOf('day').toISOString() }
    }
    if (period) return bookingPeriodRange(period)
    return {}
  }, [period, selectedDayKey])

  const calendarRequest = useMemo(
    () => ({ month: monthKey, revision: listRevision, attempt: calendarAttempt, side }),
    [calendarAttempt, monthKey, listRevision, side]
  )
  const [calendarFulfilled, setCalendarFulfilled] = useState<object | null>(null)
  const calendarLoading = calendarFulfilled !== calendarRequest

  useEffect(() => {
    let cancelled = false
    const fetchCalendar = isConsumer ? getProviderConsumerBookingsCalendarAPI : getProviderBookingsCalendarAPI

    void fetchCalendar({ month: calendarRequest.month })
      .then((days) => {
        if (cancelled) return
        setCountsByDay(days)
        setCalendarError(null)
      })
      // The list below still works, so the calendar degrades to no badges — but says so,
      // or an empty month reads as "no bookings" when it means "could not count them".
      .catch((error: unknown) => {
        if (cancelled) return
        setCountsByDay({})
        setCalendarError(error)
      })
      .finally(() => {
        if (!cancelled) setCalendarFulfilled(calendarRequest)
      })

    return () => {
      cancelled = true
    }
  }, [calendarRequest, isConsumer])

  const handleSelectDay = useCallback((dayKey: string | null) => {
    setSelectedDayKey(dayKey)
    if (dayKey) setPeriod(null)
  }, [])

  const handlePeriod = useCallback((next: BookingPeriod | null) => {
    setPeriod(next)
    if (next) setSelectedDayKey(null)
  }, [])

  const handleClearDay = useCallback(() => {
    setSelectedDayKey(null)
    setPeriod('upcoming')
  }, [])

  const handleStatusWritten = useCallback(() => {
    setRevision((current) => current + 1)
  }, [])

  return (
    <div className='flex flex-col gap-6'>
      {calendarOpen && calendarError !== null && (
        <ErrorAlert
          tone='warning'
          error={calendarError}
          title={tErrors('sections.load')}
          onRetry={() => setCalendarAttempt((current) => current + 1)}
        />
      )}

      <ProviderBookingsCalendar
        month={month}
        selectedDayKey={selectedDayKey}
        countsByDay={countsByDay}
        loading={calendarLoading}
        open={calendarOpen}
        onToggle={() => setCalendarOpen((open) => !open)}
        onSelectDay={handleSelectDay}
        onMonthChange={setMonth}
      />

      <BookingsList
        side={side}
        dayRange={dayRange}
        selectedDayKey={selectedDayKey}
        period={period}
        onPeriodChange={handlePeriod}
        onClearDay={handleClearDay}
        revision={listRevision}
        onStatusWritten={handleStatusWritten}
      />
    </div>
  )
}
