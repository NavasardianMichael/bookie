'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Segmented, Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { getReviewReportsAPI, patchReviewReportAPI, patchReviewVisibilityAPI } from '@api/reviews/main'
import { ReviewReport, ReviewReportStatus } from '@store/reviews/list/types'
import { useErrorToast } from '@hooks/useErrorToast'
import { classifyError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { RatingStars } from '@components/ui/bare/RatingStars'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

const STATUS_TONE: Record<ReviewReportStatus, string> = {
  open: 'orange',
  resolved: 'green',
  dismissed: 'default',
}

/** The `Admin.status*` catalogue key for each status, so the label needs no branching. */
const STATUS_LABEL_KEY: Record<ReviewReportStatus, 'statusOpen' | 'statusResolved' | 'statusDismissed'> = {
  open: 'statusOpen',
  resolved: 'statusResolved',
  dismissed: 'statusDismissed',
}

/**
 * The review moderation queue — the app's only admin screen.
 *
 * A client component rather than a Server Component, unusually for this codebase, and
 * deliberately: every row is worked by acting on it and seeing the result, so the page is
 * interaction from top to bottom. There is nothing here for a crawler to read, and
 * `page.tsx` marks it `noindex` for that reason.
 *
 * **Authorization is entirely the API's.** This renders no guard of its own: a
 * non-admin's request answers 404, which is read as an empty list, and the page shows its
 * empty state. Putting a check here too would be a second copy of the rule that could
 * disagree with the real one — and it would still protect nothing, since the data is the
 * thing being guarded.
 */
export const AdminReviewsClient = () => {
  const t = useTranslations('Admin')
  const tReviews = useTranslations('Provider.reviews')
  const format = useFormatter()
  const showError = useErrorToast()

  const [status, setStatus] = useState<ReviewReportStatus>('open')
  const [items, setItems] = useState<ReviewReport[]>([])
  const [loadError, setLoadError] = useState<unknown>(null)
  // Bumped after every write to re-run the fetch, so a hidden review and a closed report
  // both reload from the server rather than being patched into local state — the row's
  // status and the review's visibility change together and must be read back together.
  const [revision, setRevision] = useState(0)

  /**
   * Loading is **derived**, not set inside the effect — `react-hooks/set-state-in-effect`
   * is an error in this repo. The identity of `query` is the request; until the effect
   * reports that same object back as `fulfilled`, one is in flight. Same idiom as
   * `ConsumerAppointmentsClient`.
   */
  const query = useMemo(() => ({ status, revision }), [status, revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  useEffect(() => {
    let cancelled = false

    void getReviewReportsAPI({ status: query.status })
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // Rows from another status, or from before a write, are wrong either way.
        setItems([])
        // The 404 is how the API turns away a non-admin — see above — not a failure.
        setLoadError(classifyError(err).kind === 'notFound' ? null : err)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(query)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  const reload = () => setRevision((current) => current + 1)

  // A toast, not the inline alert: the row acted on can sit far below the top of the list.
  const act = useCallback(
    async (action: () => Promise<void>) => {
      try {
        await action()
        setRevision((current) => current + 1)
      } catch (err) {
        showError(err)
      }
    },
    [showError]
  )

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('metaDescription')} />

      <Segmented
        value={status}
        onChange={(next) => setStatus(next as ReviewReportStatus)}
        options={[
          { value: 'open', label: t('statusOpen') },
          { value: 'resolved', label: t('statusResolved') },
          { value: 'dismissed', label: t('statusDismissed') },
        ]}
      />

      {loadError !== null ? (
        <ErrorAlert error={loadError} onRetry={reload} retrying={loading} />
      ) : (
        !loading && !items.length && <EmptyState title={t('empty')} description={t('emptyHint')} />
      )}

      <ul className='m-0 flex list-none flex-col gap-4 p-0'>
        {items.map((report) => (
          <Surface as='li' key={report.id} className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <Tag color={STATUS_TONE[report.status]}>{t(STATUS_LABEL_KEY[report.status])}</Tag>
                {report.review.isHidden && <Tag color='red'>{t('hidden')}</Tag>}
                <AppText size='caption' tone='muted'>
                  {format.dateTime(new Date(report.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
                </AppText>
              </div>
              <AppText size='caption' tone='muted'>
                {t('reportedBy', { name: report.review.providerName ?? '—' })}
              </AppText>
            </div>

            <div>
              <AppTitle level='h2' size='h3'>
                {t('reason')}
              </AppTitle>
              <AppParagraph size='body-sm' tone='default' className='m-0 whitespace-pre-wrap'>
                {report.reason}
              </AppParagraph>
            </div>

            <div className='border-brand-border-subtle rounded-brand-sm border p-3'>
              <div className='mb-1 flex flex-wrap items-center gap-2'>
                <RatingStars
                  value={report.review.rating}
                  size='sm'
                  label={tReviews('ratingAria', { rating: report.review.rating })}
                />
                <AppText size='body-sm' as='strong'>
                  {report.review.author}
                </AppText>
              </div>
              <AppParagraph size='body-sm' tone='default' className='m-0 whitespace-pre-wrap'>
                {report.review.comment ?? '—'}
              </AppParagraph>
            </div>

            <div className='flex flex-wrap justify-end gap-2'>
              <AppButton
                danger={!report.review.isHidden}
                onClick={() =>
                  void act(async () => {
                    await patchReviewVisibilityAPI({
                      id: report.review.id,
                      hidden: !report.review.isHidden,
                      reason: report.reason,
                    })
                  })
                }
              >
                {report.review.isHidden ? t('restore') : t('hide')}
              </AppButton>

              {report.status === 'open' && (
                <>
                  <AppButton
                    onClick={() =>
                      void act(async () => {
                        await patchReviewReportAPI({ id: report.id, status: 'dismissed' })
                      })
                    }
                  >
                    {t('dismiss')}
                  </AppButton>
                  <AppButton
                    type='primary'
                    onClick={() =>
                      void act(async () => {
                        await patchReviewReportAPI({ id: report.id, status: 'resolved' })
                      })
                    }
                  >
                    {t('resolve')}
                  </AppButton>
                </>
              )}
            </div>
          </Surface>
        ))}
      </ul>
    </>
  )
}
