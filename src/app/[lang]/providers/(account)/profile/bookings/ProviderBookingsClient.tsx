'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pagination, Select, Tag } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useFormatter, useTranslations } from 'next-intl'
import { getProviderBookingsAPI, getProviderBookingsCalendarAPI, patchAppointmentStatusAPI } from '@api/appointments/main'
import {
  BOOKING_STATUSES,
  BookingStatus,
  PROVIDER_BOOKINGS_SORTS,
  ProviderBooking,
  ProviderBookingsSort,
} from '@api/appointments/types'
import { getProviderProfileAPI } from '@api/providers/main'
import { useDebouncedCallback } from '@hooks/useDebouncedCallback'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppInput } from '@components/ui/AppInput'
import { AppText } from '@components/ui/bare/AppText'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { Surface } from '@components/ui/layout/Surface'
import { StatTile } from '@components/ui/StatTile'
import { DayBookingCount, ProviderBookingsCalendar } from './ProviderBookingsCalendar'

/** How each status reads as an antd `Tag` colour. Cancelled and no-show are not the same event. */
const STATUS_TONE: Record<BookingStatus, string> = {
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'default',
  cancelled: 'red',
  no_show: 'orange',
}

/** Statuses a provider can move a booking into from this screen. */
const ACTIONABLE: BookingStatus[] = ['confirmed', 'completed', 'no_show', 'cancelled']

const SEARCH_DEBOUNCE_MS = 350

/**
 * A provider's own booking history: a month calendar over a filtered, sorted, paged list.
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
export const ProviderBookingsClient = () => {
  const t = useTranslations('Settings.bookings')
  const tStatus = useTranslations('Settings.bookings.status')
  const format = useFormatter()

  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'))
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<BookingStatus[]>([])
  const [serviceId, setServiceId] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState<ProviderBookingsSort>('startDesc')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<ProviderBooking[]>([])
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [countsByDay, setCountsByDay] = useState<Record<string, DayBookingCount>>({})
  const [services, setServices] = useState<{ value: string; label: string }[]>([])

  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ booking: ProviderBooking; status: BookingStatus } | null>(null)

  /** Bumped after a status write so the list and the calendar both refetch. */
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

  // The service filter's options. Read once — a provider's catalogue does not change
  // while they are reading their calendar, and a failure here must not take the list
  // down with it.
  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => {
        setServices(
          profile.services.allIds.map((id) => ({ value: id, label: profile.services.byId[id]?.name ?? id }))
        )
      })
      .catch(() => setServices([]))
  }, [])

  /**
   * The request as one memoized object, which doubles as its own identity.
   *
   * `loading` is **derived** from whether the last fulfilled request is this one, rather
   * than set at the top of the effect: `react-hooks/set-state-in-effect` is an ESLint
   * error in this repo, and a derived flag cannot drift out of step with the fetch the
   * way two `setLoading` calls on separate paths can.
   */
  const query = useMemo(
    () => ({
      ...dayRange,
      status: statuses.length ? statuses : undefined,
      serviceId,
      q: search || undefined,
      sort,
      page,
      // Not sent — it only makes a status write produce a new identity, and therefore a
      // refetch, without another flag to reset.
      revision,
    }),
    [dayRange, statuses, serviceId, search, sort, page, revision]
  )

  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  useEffect(() => {
    let cancelled = false
    const { revision: _ignored, ...params } = query

    void getProviderBookingsAPI(params)
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
        setPerPage(result.perPage)
        // The API clamps an out-of-range page, so the pager is told what was actually
        // served rather than what was asked for.
        setPage(result.page)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(processError(err).message)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(query)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  const calendarRequest = useMemo(() => ({ month: monthKey, revision }), [monthKey, revision])
  const [calendarFulfilled, setCalendarFulfilled] = useState<object | null>(null)
  const calendarLoading = calendarFulfilled !== calendarRequest

  useEffect(() => {
    let cancelled = false

    void getProviderBookingsCalendarAPI({ month: calendarRequest.month })
      .then((days) => {
        if (!cancelled) setCountsByDay(days)
      })
      // The grid degrades to unbadged days rather than showing an error over the list,
      // which is the thing the provider actually came for.
      .catch(() => {
        if (!cancelled) setCountsByDay({})
      })
      .finally(() => {
        if (!cancelled) setCalendarFulfilled(calendarRequest)
      })

    return () => {
      cancelled = true
    }
  }, [calendarRequest])

  const commitSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, SEARCH_DEBOUNCE_MS)

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(event.target.value)
      commitSearch(event.target.value)
    },
    [commitSearch]
  )

  const handleSelectDay = useCallback((dayKey: string | null) => {
    setSelectedDayKey(dayKey)
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSelectedDayKey(null)
    setStatuses([])
    setServiceId(undefined)
    setSearch('')
    setSearchInput('')
    setSort('startDesc')
    setPage(1)
  }, [])

  /**
   * Deliberately written with no try/catch: `AppConfirmModal` awaits this, surfaces a
   * rejection through `processError` and leaves itself open, so catching here would
   * swallow the only signal the provider gets.
   */
  const handleConfirmStatus = useCallback(async () => {
    if (!pending) return
    await patchAppointmentStatusAPI({ id: pending.booking.id, status: pending.status })
    setPending(null)
    setRevision((current) => current + 1)
  }, [pending])

  const monthTotals = useMemo(
    () =>
      Object.values(countsByDay).reduce(
        (acc, day) => ({ total: acc.total + day.total, live: acc.live + day.live }),
        { total: 0, live: 0 }
      ),
    [countsByDay]
  )

  const hasFilters = Boolean(selectedDayKey || statuses.length || serviceId || search)

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <ResponsiveGrid min='sm'>
        <StatTile label={t('statMonthTotal')} value={monthTotals.total} hint={month.format('MMMM YYYY')} />
        <StatTile
          label={t('statMonthLive')}
          value={monthTotals.live}
          hint={t('statMonthLiveHint', { count: monthTotals.total - monthTotals.live })}
        />
        <StatTile label={t('statMatching')} value={total} hint={hasFilters ? t('filtered') : t('allBookings')} />
      </ResponsiveGrid>

      <ProviderBookingsCalendar
        month={month}
        selectedDayKey={selectedDayKey}
        countsByDay={countsByDay}
        loading={calendarLoading}
        onSelectDay={handleSelectDay}
        onMonthChange={setMonth}
      />

      <Surface className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <AppInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            allowClear
            className='min-w-0 flex-1 basis-56'
          />

          <Select<BookingStatus[]>
            mode='multiple'
            value={statuses}
            onChange={(next) => {
              setStatuses(next)
              setPage(1)
            }}
            placeholder={t('statusPlaceholder')}
            aria-label={t('statusLabel')}
            options={BOOKING_STATUSES.map((status) => ({ value: status, label: tStatus(status) }))}
            maxTagCount='responsive'
            className='min-w-44 flex-1 basis-44'
          />

          <Select<string | undefined>
            value={serviceId}
            onChange={(next) => {
              setServiceId(next)
              setPage(1)
            }}
            placeholder={t('servicePlaceholder')}
            aria-label={t('serviceLabel')}
            options={services}
            allowClear
            className='min-w-44 flex-1 basis-44'
          />

          <Select<ProviderBookingsSort>
            value={sort}
            onChange={(next) => {
              setSort(next)
              setPage(1)
            }}
            aria-label={t('sortLabel')}
            options={PROVIDER_BOOKINGS_SORTS.map((value) => ({ value, label: t(`sort.${value}`) }))}
            className='min-w-44 flex-1 basis-44'
          />

          {hasFilters && <AppButton onClick={handleClearFilters}>{t('clearFilters')}</AppButton>}
        </div>

        {loading ? (
          <div className='bg-brand-50 min-h-64 animate-pulse rounded-brand' />
        ) : items.length === 0 ? (
          <EmptyState
            title={hasFilters ? t('emptyFilteredTitle') : t('emptyTitle')}
            description={hasFilters ? t('emptyFilteredBody') : t('emptyBody')}
            action={hasFilters ? <AppButton onClick={handleClearFilters}>{t('clearFilters')}</AppButton> : undefined}
          />
        ) : (
          <ul className='flex list-none flex-col gap-3 p-0'>
            {items.map((booking) => {
              const start = new Date(booking.time.startDate)
              const name = `${booking.booker.firstName} ${booking.booker.lastName}`.trim() || t('unknownBooker')

              return (
                <li
                  key={booking.id}
                  className='border-brand-border hover:bg-surface-sunken flex flex-wrap items-start gap-4 rounded-brand border p-4 transition-colors'
                >
                  <div className='min-w-0 flex-1 basis-56'>
                    <AppText size='caption' className='text-brand block font-bold'>
                      {format.dateTime(start, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </AppText>
                    <AppText size='body' tone='default' className='block font-bold'>
                      {name}
                      {booking.booker.kind === 'guest' && (
                        <Tag className='ms-2' color='default'>
                          {t('guest')}
                        </Tag>
                      )}
                    </AppText>
                    <AppText size='caption' tone='muted' className='block'>
                      {booking.service.name || t('unknownService')} · {t('minutes', { count: booking.time.duration })}
                    </AppText>
                  </div>

                  <div className='min-w-0 basis-48'>
                    {/* The contact details are the reason this list exists — a day's
                        clients that cannot be reached is not a client list. */}
                    <AppText size='caption' tone='muted' className='block'>
                      +{booking.booker.phone.code} {booking.booker.phone.number}
                    </AppText>
                    {booking.booker.email && (
                      <AppText size='caption' tone='muted' className='block truncate'>
                        {booking.booker.email}
                      </AppText>
                    )}
                    {booking.price !== undefined && (
                      <AppText size='caption' tone='default' className='block font-semibold'>
                        {booking.currency ? `${booking.price} ${booking.currency}` : booking.price}
                      </AppText>
                    )}
                  </div>

                  <div className='flex shrink-0 flex-wrap items-center gap-2'>
                    <Tag color={STATUS_TONE[booking.status]}>{tStatus(booking.status)}</Tag>
                    {ACTIONABLE.filter((status) => status !== booking.status).map((status) => (
                      <AppButton
                        key={status}
                        size='small'
                        danger={status === 'cancelled' || status === 'no_show'}
                        onClick={() => setPending({ booking, status })}
                      >
                        {tStatus(status)}
                      </AppButton>
                    ))}
                  </div>

                  {booking.notes && (
                    <AppText size='caption' tone='muted' className='basis-full italic'>
                      {booking.notes}
                    </AppText>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* antd's pager, not `ui/layout/Pagination`: that one renders real anchors for a
            crawlable public list, and here a page change must not navigate. This is the
            case `src/components/CLAUDE.md` names for antd's. */}
        {total > perPage && (
          <Pagination
            current={page}
            pageSize={perPage}
            total={total}
            onChange={setPage}
            showSizeChanger={false}
            hideOnSinglePage
            className='self-center'
          />
        )}
      </Surface>

      <AppConfirmModal
        open={Boolean(pending)}
        title={t('confirmTitle', { status: pending ? tStatus(pending.status) : '' })}
        description={t('confirmBody')}
        tone={pending?.status === 'cancelled' || pending?.status === 'no_show' ? 'danger' : 'default'}
        onConfirm={handleConfirmStatus}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
