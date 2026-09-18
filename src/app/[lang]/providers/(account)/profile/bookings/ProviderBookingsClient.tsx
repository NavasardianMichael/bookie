'use client'

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { getProviderBookingsCalendarAPI, getProviderConsumerBookingsCalendarAPI } from '@api/appointments/main'
import { ROUTES } from '@constants/routes'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { AppLink } from '@components/ui/bare/AppLink'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { BookingsList, BookingsSide } from './BookingsList'
import { DayBookingCount, ProviderBookingsCalendar } from './ProviderBookingsCalendar'

type Props = {
  side: BookingsSide
}

/**
 * A provider's bookings: a month calendar over History's filtered, sorted, paged list.
 *
 * `side` is which identity the list is for. `'provider'` is appointments booked *with*
 * this professional; `'consumer'` is appointments they booked with someone else. The
 * two live on sibling URLs and share this client so the calendar, the filters and the
 * kebab stay one implementation. The header switch is how you move between them —
 * there is no second sidebar tab, because that would be two mental models for one
 * workspace surface.
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
export const ProviderBookingsClient: FC<Props> = ({ side }) => {
  const t = useTranslations('Settings.bookings')
  const isConsumer = side === 'consumer'

  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'))
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [countsByDay, setCountsByDay] = useState<Record<string, DayBookingCount>>({})
  const [revision, setRevision] = useState(0)

  const monthKey = month.format('YYYY-MM')

  /**
   * The day filter as an inclusive instant range. Sent as a whole local day rather than
   * a bare date so the server, which compares UTC instants, keeps the same day the
   * provider clicked.
   */
  const dayRange = useMemo(() => {
    if (!selectedDayKey) return {}
    const day = dayjs(selectedDayKey, DAY_KEY_FORMAT)
    return { from: day.startOf('day').toISOString(), to: day.endOf('day').toISOString() }
  }, [selectedDayKey])

  const calendarRequest = useMemo(() => ({ month: monthKey, revision, side }), [monthKey, revision, side])
  const [calendarFulfilled, setCalendarFulfilled] = useState<object | null>(null)
  const calendarLoading = calendarFulfilled !== calendarRequest

  useEffect(() => {
    let cancelled = false
    const fetchCalendar = isConsumer ? getProviderConsumerBookingsCalendarAPI : getProviderBookingsCalendarAPI

    void fetchCalendar({ month: calendarRequest.month })
      .then((days) => {
        if (!cancelled) setCountsByDay(days)
      })
      .catch(() => {
        if (!cancelled) setCountsByDay({})
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
  }, [])

  const handleClearDay = useCallback(() => {
    setSelectedDayKey(null)
  }, [])

  const handleStatusWritten = useCallback(() => {
    setRevision((current) => current + 1)
  }, [])

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title={isConsumer ? t('asConsumerTitle') : t('title')}
        subtitle={isConsumer ? t('asConsumerSubtitle') : t('subtitle')}
        actions={
          <AppLink
            href={isConsumer ? ROUTES.providerProfileBookings : ROUTES.providerProfileConsumerBookings}
            variant='button'
            tone='primary'
            className='h-auto min-h-8 whitespace-normal py-2 text-center'
          >
            {isConsumer ? t('switchToProvider') : t('switchToConsumer')}
            <ArrowRightOutlined aria-hidden />
          </AppLink>
        }
      />

      <ProviderBookingsCalendar
        month={month}
        selectedDayKey={selectedDayKey}
        countsByDay={countsByDay}
        loading={calendarLoading}
        onSelectDay={handleSelectDay}
        onMonthChange={setMonth}
      />

      <BookingsList
        side={side}
        dayRange={dayRange}
        selectedDayKey={selectedDayKey}
        onClearDay={handleClearDay}
        revision={revision}
        onStatusWritten={handleStatusWritten}
      />
    </div>
  )
}
