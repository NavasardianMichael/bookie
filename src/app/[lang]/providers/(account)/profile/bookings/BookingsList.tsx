'use client'

import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AppstoreOutlined, MoreOutlined, SearchOutlined, SortAscendingOutlined, TagOutlined } from '@ant-design/icons'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Dropdown, Pagination, Select, Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import {
  getProviderBookingsAPI,
  getProviderConsumerBookingsAPI,
  patchAppointmentStatusAPI,
} from '@api/appointments/main'
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
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppInput } from '@components/ui/AppInput'
import { AppText } from '@components/ui/bare/AppText'
import { EmptyState } from '@components/ui/EmptyState'
import { Surface } from '@components/ui/layout/Surface'

const SEARCH_DEBOUNCE_MS = 350

export type BookingsSide = 'provider' | 'consumer'

/** Statuses a receiving provider can move a booking into from this screen. */
const PROVIDER_ACTIONABLE: BookingStatus[] = ['confirmed', 'completed', 'no_show', 'cancelled']
const DANGEROUS: BookingStatus[] = ['cancelled', 'no_show']

const actionsFor = (side: BookingsSide, status: BookingStatus): BookingStatus[] => {
  if (side === 'consumer') {
    return status === 'scheduled' || status === 'confirmed' ? ['cancelled'] : []
  }
  return PROVIDER_ACTIONABLE.filter((next) => next !== status)
}

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

type BookingActionsMenuProps = {
  name: string
  actions: BookingStatus[]
  onPick: (status: BookingStatus) => void
}

const BookingActionsMenu: FC<BookingActionsMenuProps> = ({ name, actions, onPick }) => {
  const t = useTranslations('Settings.bookings')
  const tStatus = useTranslations('Settings.bookings.status')

  const items = useMemo(
    () =>
      actions.map((status) => ({
        key: status,
        label: tStatus(status),
        danger: DANGEROUS.includes(status),
      })),
    [actions, tStatus]
  )

  if (items.length === 0) return null

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => onPick(key as BookingStatus),
      }}
      trigger={['click']}
      placement='bottomRight'
    >
      <AppButton
        type='text'
        icon={<MoreOutlined />}
        aria-label={t('moreActions', { name })}
        className='min-h-11 min-w-11'
      />
    </Dropdown>
  )
}

type Props = {
  side: BookingsSide
  /** Inclusive local-day range from the calendar, or empty when every day is shown. */
  dayRange: { from?: string; to?: string }
  selectedDayKey: string | null
  onClearDay: () => void
  /** Bumped after a status write so the list and the calendar both refetch. */
  revision: number
  onStatusWritten: () => void
}

/**
 * Search, status, service, sort and a paged list. Status writes live in a kebab on
 * each row, not as always-on buttons — History's row is a record, and a toolbar of
 * four actions on every card reads as a control panel. The calendar day-filter is
 * owned by the parent and arrives as `dayRange`.
 *
 * `side` picks the API and which verbs the kebab offers. A consumer-side row can
 * only cancel an upcoming booking; confirm / complete / no-show belong to the
 * professional who received it.
 */
export const BookingsList: FC<Props> = ({
  side,
  dayRange,
  selectedDayKey,
  onClearDay,
  revision,
  onStatusWritten,
}) => {
  const tBookings = useTranslations('Settings.bookings')
  const tAppointments = useTranslations('Settings.appointments')
  const tHistory = useTranslations('Settings.history')
  const tStatus = useTranslations('Settings.bookings.status')
  const format = useFormatter()
  const isConsumer = side === 'consumer'

  const [statuses, setStatuses] = useState<BookingStatus[]>([])
  const [serviceId, setServiceId] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState<ProviderBookingsSort>('startDesc')
  const [pageState, setPageState] = useState({ dayKey: selectedDayKey, page: 1 })
  const page = pageState.dayKey === selectedDayKey ? pageState.page : 1
  const setPage = useCallback((next: number) => setPageState({ dayKey: selectedDayKey, page: next }), [selectedDayKey])

  const [items, setItems] = useState<ProviderBooking[]>([])
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [services, setServices] = useState<{ value: string; label: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ booking: ProviderBooking; status: BookingStatus } | null>(null)

  const query = useMemo(
    () => ({
      ...dayRange,
      status: statuses.length ? statuses : undefined,
      serviceId: isConsumer ? undefined : serviceId,
      q: search || undefined,
      sort,
      page,
      perPage,
      revision,
      side,
    }),
    [dayRange, statuses, serviceId, search, sort, page, perPage, revision, side, isConsumer]
  )

  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  useEffect(() => {
    if (isConsumer) return

    void getProviderProfileAPI()
      .then((profile) => {
        setServices(
          profile.services.allIds.map((id) => ({ value: id, label: profile.services.byId[id]?.name ?? id }))
        )
      })
      .catch(() => setServices([]))
  }, [isConsumer])

  useEffect(() => {
    let cancelled = false
    const { revision: _ignored, side: _side, ...params } = query
    const fetchList = isConsumer ? getProviderConsumerBookingsAPI : getProviderBookingsAPI

    void fetchList(params)
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
  }, [query, isConsumer, setPage])

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
    onClearDay()
  }, [onClearDay, setPage])

  const hasFilters = Boolean(selectedDayKey || statuses.length || (!isConsumer && serviceId) || search)

  /**
   * Deliberately written with no try/catch: `AppConfirmModal` awaits this, surfaces a
   * rejection through `processError` and leaves itself open, so catching here would
   * swallow the only signal the provider gets.
   */
  const handleConfirmStatus = useCallback(async () => {
    if (!pending) return
    await patchAppointmentStatusAPI({ id: pending.booking.id, status: pending.status })
    setPending(null)
    onStatusWritten()
  }, [pending, onStatusWritten])

  return (
    <Surface className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <AppInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={isConsumer ? tAppointments('searchPlaceholder') : tBookings('searchPlaceholder')}
            aria-label={isConsumer ? tAppointments('searchLabel') : tBookings('searchLabel')}
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
            options={PROVIDER_BOOKINGS_SORTS.map((value) => ({
              value,
              label:
                value === 'nameAsc' && isConsumer
                  ? tAppointments('sort.nameAsc')
                  : tBookings(`sort.${value}`),
            }))}
            popupMatchSelectWidth={false}
            className='min-w-56 flex-none'
          />
        </div>

        <div className='flex flex-wrap items-end gap-3'>
          <FilterField id='bookings-status' label={tHistory('status')} icon={<TagOutlined />}>
            <Select<BookingStatus[]>
              id='bookings-status'
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

          {!isConsumer && (
            <FilterField id='bookings-service' label={tHistory('service')} icon={<AppstoreOutlined />}>
              <Select<string | undefined>
                id='bookings-service'
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
          )}

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
          title={
            hasFilters
              ? tBookings('emptyFilteredTitle')
              : isConsumer
                ? tBookings('emptyAsConsumerTitle')
                : tBookings('emptyTitle')
          }
          description={
            hasFilters
              ? tBookings('emptyFilteredBody')
              : isConsumer
                ? tBookings('emptyAsConsumerBody')
                : tBookings('emptyBody')
          }
          action={hasFilters ? <AppButton onClick={handleClearFilters}>{tBookings('clearFilters')}</AppButton> : undefined}
        />
      ) : (
        <ul className='flex list-none flex-col gap-3 p-0'>
          {items.map((booking) => {
            const start = new Date(booking.time.startDate)
            const name =
              `${booking.booker.firstName} ${booking.booker.lastName}`.trim() ||
              (isConsumer ? tAppointments('unknownProvider') : tBookings('unknownBooker'))
            const rowActions = actionsFor(side, booking.status)

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

                <div className='flex shrink-0 items-center gap-1'>
                  <Tag color={STATUS_TONE[booking.status]}>{tStatus(booking.status)}</Tag>
                  <BookingActionsMenu
                    name={name}
                    actions={rowActions}
                    onPick={(status) => setPending({ booking, status })}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* antd's pager, not `ui/layout/Pagination`: that one renders real anchors for a
          crawlable public list, and here a page change must not navigate. Shown whenever
          there is a list, including a single page — this is every booking, and hiding
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

      <AppConfirmModal
        open={Boolean(pending)}
        title={tBookings('confirmTitle', { status: pending ? tStatus(pending.status) : '' })}
        description={isConsumer ? tBookings('confirmBodyAsConsumer') : tBookings('confirmBody')}
        tone={pending?.status === 'cancelled' || pending?.status === 'no_show' ? 'danger' : 'default'}
        onConfirm={handleConfirmStatus}
        onCancel={() => setPending(null)}
      />
    </Surface>
  )
}
