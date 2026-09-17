'use client'

import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AppstoreOutlined, SearchOutlined, SortAscendingOutlined, TagOutlined } from '@ant-design/icons'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Pagination, Select, Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { getProviderBookingsAPI } from '@api/appointments/main'
import {
  BOOKING_STATUSES,
  BookingStatus,
  PROVIDER_BOOKINGS_SORTS,
  ProviderBooking,
  ProviderBookingsSort,
} from '@api/appointments/types'
import { getProviderProfileAPI } from '@api/providers/main'
import { useDebouncedCallback } from '@hooks/useDebouncedCallback'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppInput } from '@components/ui/AppInput'
import { AppText } from '@components/ui/bare/AppText'
import { EmptyState } from '@components/ui/EmptyState'
import { Surface } from '@components/ui/layout/Surface'

const SEARCH_DEBOUNCE_MS = 350

type FilterFieldProps = {
  id: string
  label: string
  icon: ReactNode
  children: ReactNode
}

const FilterField: FC<FilterFieldProps> = ({ id, label, icon, children }) => (
  <div className='flex min-w-44 flex-1 basis-44 flex-col gap-1'>
    <div className='flex items-center gap-2'>
      <span className='text-brand-muted leading-none' aria-hidden>
        {icon}
      </span>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
    </div>
    {children}
  </div>
)

const STATUS_TONE: Record<ProviderBooking['status'], string> = {
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'default',
  cancelled: 'red',
  no_show: 'orange',
}

/**
 * The paged booking list on the History page. Search, status, service, sort and
 * pagination live here rather than on the analytics aggregate, which has no rows to
 * page. The Bookings tab already has the same controls plus the calendar and status
 * writes; this list is the matching surface for those numbers, not a second place to
 * change a booking's status. It is not filtered by Analytics' range — that window is
 * for charts, and mixing the two would make a search look like a broken chart.
 */
export const HistoryBookingsList: FC = () => {
  const tBookings = useTranslations('Settings.bookings')
  const tHistory = useTranslations('Settings.history')
  const tStatus = useTranslations('Settings.bookings.status')
  const format = useFormatter()

  const [statuses, setStatuses] = useState<BookingStatus[]>([])
  const [serviceId, setServiceId] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState<ProviderBookingsSort>('startDesc')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<ProviderBooking[]>([])
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [services, setServices] = useState<{ value: string; label: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(
    () => ({
      status: statuses.length ? statuses : undefined,
      serviceId,
      q: search || undefined,
      sort,
      page,
      perPage,
    }),
    [statuses, serviceId, search, sort, page, perPage]
  )

  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  // Read once — a failure here must not take the list down with it.
  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => {
        setServices(
          profile.services.allIds.map((id) => ({ value: id, label: profile.services.byId[id]?.name ?? id }))
        )
      })
      .catch(() => setServices([]))
  }, [])

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

  const handleClearFilters = useCallback(() => {
    setStatuses([])
    setServiceId(undefined)
    setSearch('')
    setSearchInput('')
    setSort('startDesc')
    setPage(1)
  }, [])

  const hasFilters = Boolean(statuses.length || serviceId || search)

  return (
    <Surface className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <AppInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={tBookings('searchPlaceholder')}
            aria-label={tBookings('searchLabel')}
            prefix={<SearchOutlined className='text-brand-muted' aria-hidden />}
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
            prefix={<SortAscendingOutlined className='text-brand-muted' aria-hidden />}
            options={PROVIDER_BOOKINGS_SORTS.map((value) => ({ value, label: tBookings(`sort.${value}`) }))}
            popupMatchSelectWidth={false}
            className='min-w-56 flex-none'
          />
        </div>

        <div className='flex flex-wrap items-end gap-3'>
          <FilterField id='history-status' label={tHistory('status')} icon={<TagOutlined />}>
            <Select<BookingStatus[]>
              id='history-status'
              mode='multiple'
              value={statuses}
              onChange={(next) => {
                setStatuses(next)
                setPage(1)
              }}
              placeholder={tBookings('statusPlaceholder')}
              aria-label={tBookings('statusLabel')}
              options={BOOKING_STATUSES.map((status) => ({ value: status, label: tStatus(status) }))}
              maxTagCount='responsive'
              className='w-full'
            />
          </FilterField>

          <FilterField id='history-service' label={tHistory('service')} icon={<AppstoreOutlined />}>
            <Select<string | undefined>
              id='history-service'
              value={serviceId}
              onChange={(next) => {
                setServiceId(next)
                setPage(1)
              }}
              placeholder={tBookings('servicePlaceholder')}
              aria-label={tBookings('serviceLabel')}
              options={services}
              allowClear
              className='w-full'
            />
          </FilterField>

          {hasFilters && (
            <AppButton className='shrink-0' onClick={handleClearFilters}>
              {tBookings('clearFilters')}
            </AppButton>
          )}
        </div>
      </div>

      {error && <Alert type='error' showIcon message={error} />}

      {loading ? (
        <div className='bg-brand-50 min-h-64 animate-pulse rounded-brand' />
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilters ? tBookings('emptyFilteredTitle') : tBookings('emptyTitle')}
          description={hasFilters ? tBookings('emptyFilteredBody') : tBookings('emptyBody')}
          action={hasFilters ? <AppButton onClick={handleClearFilters}>{tBookings('clearFilters')}</AppButton> : undefined}
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

      {/* antd's pager, not `ui/layout/Pagination`: that one renders real anchors for a
          crawlable public list, and here a page change must not navigate. Shown whenever
          there is a list, including a single page — History is every booking, and hiding
          the control until 20 rows makes it look missing. `totalBoundaryShowSizeChanger`
          defaults to 50, which would hide the size changer the same way. */}
      {total > 0 && (
        <Pagination
          current={page}
          pageSize={perPage}
          total={total}
          onChange={(nextPage, nextSize) => {
            setPage(nextPage)
            setPerPage(nextSize)
          }}
          showSizeChanger
          totalBoundaryShowSizeChanger={0}
          pageSizeOptions={[10, 20, 50]}
          className='self-center'
        />
      )}
    </Surface>
  )
}
