'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pagination } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderBookingsAPI, patchBookingDecisionAPI } from '@api/appointments/main'
import { BookingDecision, ProviderBooking } from '@api/appointments/types'
import { useProviderApprovalsStore } from '@store/providers/approvals/store'
import { processError } from '@helpers/error'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'
import { ApprovalSettingCard } from './ApprovalSettingCard'
import { PendingBookingCard } from './PendingBookingCard'

/**
 * Oldest slot first, not newest request first. The queue is worked against the clock:
 * the booking that runs out of time to be approved is the one starting soonest, and
 * whoever asked first is not necessarily who is waiting on the nearest date.
 */
const PENDING_QUERY = { status: ['pending'] as const, sort: 'startAsc' as const }

const PER_PAGE = 10

/**
 * The Approvals tab: the switch that creates this queue, and the queue itself.
 *
 * One screen rather than two, because the setting is only intelligible next to what it
 * produces — a provider who turns it on wants to see where the bookings will land, and a
 * provider staring at an empty queue wants to know whether it is empty or simply off.
 *
 * The list is **not** the Bookings list with a status filter, though it reads the same
 * endpoint. Bookings is a record to scan, with its verbs behind a kebab; this asks one
 * question per row and puts both answers on the surface. Filters, search and the
 * calendar are all deliberately absent: a queue you have to filter is a queue you are
 * not working through.
 *
 * `loading` is derived from a memoized request identity rather than set at the top of an
 * effect — `react-hooks/set-state-in-effect` is an error in this repo, and a flag written
 * on two paths is a flag that drifts. Same shape as `BookingsList`.
 */
export const ProviderApprovalsClient = () => {
  const t = useTranslations('Settings.approvals')
  const locale = useLocale()
  /**
   * The badge's number, written from here rather than re-read: this panel's own query
   * is `status=pending` with no other filter, so the `total` it already has *is* the
   * count. Asking the API again would be a second answer that could disagree with the
   * list on screen.
   */
  const setApprovalsCount = useProviderApprovalsStore.use.setProviderApprovalsState()

  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  /**
   * The queue, with the clock reading that decides which rows have expired.
   *
   * Stamped when the list arrives rather than read during render: `react-hooks/purity`
   * is an error here, and it is right to be — a bare `Date.now()` in the body would
   * re-judge expiry on every unrelated re-render. Refetching is what moves this on,
   * which is also when a row could genuinely have expired.
   */
  const [items, setItems] = useState<{ rows: ProviderBooking[]; asOf: number }>({ rows: [], asOf: 0 })
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [deciding, setDeciding] = useState<{ booking: ProviderBooking; decision: BookingDecision } | null>(null)
  const [inFlight, setInFlight] = useState<{ id: string; decision: BookingDecision } | null>(null)

  const query = useMemo(() => ({ ...PENDING_QUERY, page, perPage: PER_PAGE, revision }), [page, revision])

  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  useEffect(() => {
    let cancelled = false
    const { revision: _ignored, status, ...rest } = query

    void getProviderBookingsAPI({ ...rest, status: [...status] })
      .then((result) => {
        if (cancelled) return
        setItems({ rows: result.items, asOf: Date.now() })
        setTotal(result.total)
        setPage(result.page)
        setError(null)
        // This response *is* the count the sidebar badge wants, so it is published
        // rather than re-fetched. Writing it even when the page is cancelled would be
        // wrong — a superseded request's total is not the current one.
        setApprovalsCount({ count: result.total })
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
    // `setApprovalsCount` is a zustand action and stable for the life of the store, so
    // naming it here costs nothing and keeps the rule honest rather than silenced.
  }, [query, setApprovalsCount])

  const refetch = useCallback(() => setRevision((current) => current + 1), [])

  /**
   * Deliberately written with no try/catch, as `BookingsList` does: `AppConfirmModal`
   * awaits this, surfaces a rejection through `processError` and stays open, so catching
   * here would swallow the only signal the provider gets — including the `409` that
   * means someone decided this one in another tab.
   */
  const handleConfirm = useCallback(async () => {
    if (!deciding) return
    setInFlight({ id: deciding.booking.id, decision: deciding.decision })
    try {
      await patchBookingDecisionAPI({ id: deciding.booking.id, decision: deciding.decision, locale })
      setDeciding(null)
      // `refetch` re-reads the page and republishes the total through the same store, so
      // the badge follows a decision without a second request. This is the only path by
      // which the sidebar changes while the provider stays on one screen.
      refetch()
    } finally {
      setInFlight(null)
    }
  }, [deciding, locale, refetch])

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <ApprovalSettingCard onSaved={refetch} />

      <Surface className='flex flex-col gap-4'>
        <AppParagraph size='body-sm' tone='muted' className='m-0'>
          {t('queueHint')}
        </AppParagraph>

        {error && <Alert type='error' showIcon message={error} />}

        {loading ? (
          <div className='bg-brand-50 min-h-64 animate-pulse rounded-brand' />
        ) : items.rows.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
        ) : (
          <ul className='flex list-none flex-col gap-3 p-0'>
            {items.rows.map((booking) => (
              <PendingBookingCard
                key={booking.id}
                booking={booking}
                expired={new Date(booking.time.startDate).getTime() <= items.asOf}
                pending={inFlight?.id === booking.id ? inFlight.decision : null}
                onApprove={() => setDeciding({ booking, decision: 'approve' })}
                onReject={() => setDeciding({ booking, decision: 'reject' })}
              />
            ))}
          </ul>
        )}

        {/* antd's pager, not `ui/layout/Pagination`: that one renders real anchors for a
            crawlable public list, and a page change here must not navigate. */}
        {total > PER_PAGE && (
          <Pagination current={page} pageSize={PER_PAGE} total={total} onChange={setPage} className='self-center' />
        )}
      </Surface>

      <AppConfirmModal
        open={Boolean(deciding)}
        title={deciding?.decision === 'reject' ? t('confirmRejectTitle') : t('confirmApproveTitle')}
        description={deciding?.decision === 'reject' ? t('confirmRejectBody') : t('confirmApproveBody')}
        tone={deciding?.decision === 'reject' ? 'danger' : 'default'}
        onConfirm={handleConfirm}
        onCancel={() => setDeciding(null)}
      />
    </div>
  )
}
