'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Select, Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { listAppointmentsAPI, patchAppointmentStatusAPI } from '@api/appointments/main'
import { AppointmentResponse, BOOKING_STATUSES, BookingStatus } from '@api/appointments/types'
import { useDebouncedCallback } from '@hooks/useDebouncedCallback'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import {
  CONSUMER_APPOINTMENT_SORTS,
  ConsumerAppointmentSort,
  filterAndSortConsumerAppointments,
} from '@helpers/consumerAppointments'
import { generateEntityPath } from '@helpers/entities'
import { processError } from '@helpers/error'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppInput } from '@components/ui/AppInput'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: 'gold',
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'default',
  cancelled: 'red',
  no_show: 'orange',
}

const isBookingStatus = (status: string): status is BookingStatus =>
  BOOKING_STATUSES.includes(status as BookingStatus)

/** As `BookingManageClient`: a request awaiting approval is still cancellable. */
const isEditable = (status: string): boolean =>
  status === 'pending' || status === 'scheduled' || status === 'confirmed'

/**
 * Whether this visit can be reviewed — the same rule the API enforces on
 * `POST /providers/:id/reviews`: it has already happened and it was not cancelled.
 *
 * Gated on `endAt`, not on `status === 'completed'`, because completion is set by hand
 * from the provider's bookings tab and plenty of providers never set it. Mirrored here
 * only to decide whether to *offer* the link — the provider page resolves real
 * eligibility server-side (it also knows whether this visit has already been reviewed),
 * so a link shown optimistically simply lands on a page with no write CTA.
 */
const isReviewable = (item: AppointmentResponse, now: number): boolean =>
  item.status !== 'cancelled' && new Date(item.time.endDate).getTime() < now

const SEARCH_DEBOUNCE_MS = 350

export const ConsumerAppointmentsClient = () => {
  const t = useTranslations('Settings.appointments')
  const tStatus = useTranslations('Settings.bookings.status')
  const tBooking = useTranslations('Booking')
  const tReviews = useTranslations('Provider.reviews')
  const format = useFormatter()

  const [items, setItems] = useState<AppointmentResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statuses, setStatuses] = useState<BookingStatus[]>([])
  const [sort, setSort] = useState<ConsumerAppointmentSort>('startAsc')
  const [pendingCancel, setPendingCancel] = useState<AppointmentResponse | null>(null)
  const [revision, setRevision] = useState(0)
  /** When the current list was fetched. Decides which visits are in the past. */
  const [loadedAt, setLoadedAt] = useState(0)

  const query = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  useEffect(() => {
    let cancelled = false
    void listAppointmentsAPI()
      .then((all) => {
        if (cancelled) return
        setItems(all)
        /**
         * Stamped here, not read during render: `react-hooks/purity` makes `Date.now()`
         * in a render body an error, and rightly — it would make the output depend on
         * when React happened to run. Taking it once per fetch also means every row in
         * one list is judged "already happened?" against the same instant.
         */
        setLoadedAt(Date.now())
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

  const visible = useMemo(
    () => filterAndSortConsumerAppointments(items, { q: search, statuses, sort }),
    [items, search, statuses, sort]
  )


  const hasFilters = Boolean(search || statuses.length)

  const commitSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
  }, SEARCH_DEBOUNCE_MS)

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchInput(event.target.value)
      commitSearch(event.target.value)
    },
    [commitSearch]
  )

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setSearchInput('')
    setStatuses([])
    setSort('startAsc')
  }, [])

  const handleCancel = useCallback(async () => {
    if (!pendingCancel) return
    await patchAppointmentStatusAPI({ id: pendingCancel.id, status: 'cancelled' })
    setPendingCancel(null)
    setRevision((current) => current + 1)
  }, [pendingCancel])

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <AppTitle level='h2' size='h3'>
            {t('upcoming')}
          </AppTitle>
          <AppLink href={ROUTES.providers} variant='button' tone='default' className='border-dashed'>
            {t('bookService')}
          </AppLink>
        </div>

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
            onChange={setStatuses}
            placeholder={t('statusPlaceholder')}
            aria-label={t('statusLabel')}
            options={BOOKING_STATUSES.map((status) => ({ value: status, label: tStatus(status) }))}
            maxTagCount='responsive'
            className='min-w-44 flex-1 basis-44'
          />

          <Select<ConsumerAppointmentSort>
            value={sort}
            onChange={setSort}
            aria-label={t('sortLabel')}
            options={CONSUMER_APPOINTMENT_SORTS.map((value) => ({ value, label: t(`sort.${value}`) }))}
            className='min-w-44 flex-1 basis-44'
          />

          {hasFilters && <AppButton onClick={handleClearFilters}>{t('clearFilters')}</AppButton>}
        </div>

        {loading ? (
          <div className='bg-brand-50 min-h-32 animate-pulse rounded-brand' />
        ) : visible.length === 0 ? (
          <EmptyState
            title={hasFilters ? t('emptyFilteredTitle') : t('emptyTitle')}
            description={hasFilters ? t('emptyFilteredBody') : t('emptyBody')}
            action={hasFilters ? <AppButton onClick={handleClearFilters}>{t('clearFilters')}</AppButton> : undefined}
          />
        ) : (
          <ul className='flex list-none flex-col gap-3 p-0'>
            {visible.map((item) => {
              const providerName = item.provider
                ? `${item.provider.basic.firstName} ${item.provider.basic.lastName}`.trim()
                : t('unknownProvider')
              const when = new Date(item.time.startDate)
              const status = isBookingStatus(item.status) ? item.status : undefined
              const canEdit = isEditable(item.status)
              const manageHref = item.manageToken
                ? generateEntityPath(ROUTE_KEYS.bookingManage, item.manageToken)
                : undefined
              // `#reviews` so the link lands on the section rather than the top of a
              // long profile. The write CTA there appears only if the API agrees.
              const reviewHref = isReviewable(item, loadedAt)
                ? `${generateEntityPath(ROUTE_KEYS.providers, item.providerId)}#reviews`
                : undefined

              return (
                <li
                  key={item.id}
                  className='border-brand-border hover:bg-surface-sunken flex flex-wrap items-center gap-4 rounded-brand border p-3 transition-colors'
                >
                  <AppAvatar
                    src={item.provider?.basic.image}
                    name={providerName}
                    size={48}
                    shape='square'
                  />
                  <div className='min-w-0 flex-1'>
                    <AppText size='caption' className='text-brand font-bold'>
                      {format.dateTime(when, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </AppText>
                    <AppParagraph className='font-bold' tone='default'>
                      {providerName}
                    </AppParagraph>
                    <AppText size='caption' tone='muted'>
                      {item.service?.name ?? t('unknownService')}
                    </AppText>
                  </div>

                  <div className='flex shrink-0 flex-wrap items-center gap-2'>
                    {status && <Tag color={STATUS_TONE[status]}>{tStatus(status)}</Tag>}
                    {canEdit && manageHref && (
                      <AppLink href={manageHref} variant='button' tone='default'>
                        {t('edit')}
                      </AppLink>
                    )}
                    {canEdit && (
                      <AppButton danger onClick={() => setPendingCancel(item)}>
                        {t('cancel')}
                      </AppButton>
                    )}
                    {reviewHref && (
                      <AppLink href={reviewHref} variant='button' tone='default'>
                        {tReviews('write')}
                      </AppLink>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Surface>

      <AppConfirmModal
        open={Boolean(pendingCancel)}
        title={tBooking('cancelConfirmTitle')}
        description={tBooking('cancelConfirmBody')}
        tone='danger'
        onConfirm={handleCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  )
}
