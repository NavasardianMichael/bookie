'use client'

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pagination, Select, Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { getProviderBookingsAPI } from '@api/appointments/main'
import { PROVIDER_BOOKINGS_SORTS, ProviderBooking, ProviderBookingsSort } from '@api/appointments/types'
import { useDebouncedCallback } from '@hooks/useDebouncedCallback'
import { processError } from '@helpers/error'
import { AppInput } from '@components/ui/AppInput'
import { AppText } from '@components/ui/bare/AppText'
import { EmptyState } from '@components/ui/EmptyState'
import { Surface } from '@components/ui/layout/Surface'

const SEARCH_DEBOUNCE_MS = 350

const STATUS_TONE: Record<ProviderBooking['status'], string> = {
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'default',
  cancelled: 'red',
  no_show: 'orange',
}

type Props = {
  /** Lower bound of the analytics preset. Omitted for All — every booking, including upcoming. */
  from?: string
}

/**
 * The paged booking list on Analytics. Search, sort and pagination live here rather than
 * on the aggregate request, which has no rows to page. The Bookings tab already has the
 * same three controls (plus status, service and the calendar); this list is the matching
 * surface for the numbers above it, not a second place to change a booking's status.
 */
export const AnalyticsBookingsList: FC<Props> = ({ from }) => {
  const t = useTranslations('Settings.analytics')
  const tBookings = useTranslations('Settings.bookings')
  const tStatus = useTranslations('Settings.bookings.status')
  const format = useFormatter()

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState<ProviderBookingsSort>('startDesc')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<ProviderBooking[]>([])
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(
    () => ({
      from,
      q: search || undefined,
      sort,
      page,
    }),
    [from, search, sort, page]
  )

  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  useEffect(() => {
    let cancelled = false

    void getProviderBookingsAPI(query)
      .then((result) => {
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
        setPerPage(result.perPage)
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

  return (
    <Surface className='flex flex-col gap-4'>
      <AppText size='overline' tone='muted' className='font-semibold'>
        {t('listTitle')}
      </AppText>

      <div className='flex flex-wrap items-center gap-3'>
        <AppInput
          value={searchInput}
          onChange={handleSearchChange}
          placeholder={tBookings('searchPlaceholder')}
          aria-label={tBookings('searchLabel')}
          allowClear
          className='min-w-0 flex-1 basis-56'
        />

        <Select<ProviderBookingsSort>
          value={sort}
          onChange={(next) => {
            setSort(next)
            setPage(1)
          }}
          aria-label={tBookings('sortLabel')}
          options={PROVIDER_BOOKINGS_SORTS.map((value) => ({ value, label: tBookings(`sort.${value}`) }))}
          className='min-w-44 flex-1 basis-44'
        />
      </div>

      {error && <Alert type='error' showIcon message={error} />}

      {loading ? (
        <div className='bg-brand-50 min-h-64 animate-pulse rounded-brand' />
      ) : items.length === 0 ? (
        <EmptyState
          title={search ? tBookings('emptyFilteredTitle') : tBookings('emptyTitle')}
          description={search ? tBookings('emptyFilteredBody') : tBookings('emptyBody')}
        />
      ) : (
        <ul className='flex list-none flex-col gap-3 p-0'>
          {items.map((booking) => {
            const start = new Date(booking.time.startDate)
            const name = `${booking.booker.firstName} ${booking.booker.lastName}`.trim() || tBookings('unknownBooker')

            return (
              <li
                key={booking.id}
                className='border-brand-border flex flex-wrap items-start gap-4 rounded-brand border p-4'
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
                        {tBookings('guest')}
                      </Tag>
                    )}
                  </AppText>
                  <AppText size='caption' tone='muted' className='block'>
                    {booking.service.name || tBookings('unknownService')} ·{' '}
                    {tBookings('minutes', { count: booking.time.duration })}
                  </AppText>
                </div>

                <Tag color={STATUS_TONE[booking.status]}>{tStatus(booking.status)}</Tag>
              </li>
            )
          })}
        </ul>
      )}

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
  )
}
