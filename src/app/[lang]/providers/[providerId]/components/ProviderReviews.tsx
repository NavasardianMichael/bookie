import { FC } from 'react'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getProviderReviewsAPI } from '@api/reviews/main'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { RatingStars } from '@components/ui/bare/RatingStars'
import { Pagination, Surface } from '@components/ui/layout'
import { ReviewCard } from './ReviewCard'
import { buildReviewsHref } from './reviewParams'
import { WriteReviewButton } from './WriteReviewButton'

type Props = {
  providerId: string
  /** 1-based, off the URL. The API clamps it, so this is a request, not a promise. */
  page: number
}

const STAR_ROWS = [5, 4, 3, 2, 1] as const

/**
 * The reviews section on a provider's public page.
 *
 * A **Server Component** that fetches with the forwarded session cookie, exactly as the
 * page's own `loadProvider` does — that is what lets the API resolve `viewer` (may this
 * person review?) and `isMine` per row without the client asking a second time.
 *
 * The summary reads the denormalised aggregate the API returns rather than averaging the
 * page of reviews in front of it: the page is five rows and the average is over all of
 * them, so computing it here would show a different number on page 2.
 */
export const ProviderReviews: FC<Props> = async ({ providerId, page }) => {
  const [t, tCommon, cookieStore] = await Promise.all([
    getTranslations('Provider.reviews'),
    getTranslations('Common'),
    cookies(),
  ])

  /**
   * A failed review fetch must not take the page down with it. The rest of the profile —
   * identity, hours, the whole booking flow — is already rendered and useful, so this
   * degrades to a message where it sits.
   */
  let data
  try {
    data = await getProviderReviewsAPI({ providerId, cookie: cookieStore.toString(), query: { page } })
  } catch {
    return (
      <Surface>
        <AppTitle level='h2' size='h3' className='mb-3'>
          {t('title')}
        </AppTitle>
        <AppParagraph size='body-sm'>{t('loadError')}</AppParagraph>
      </Surface>
    )
  }

  const { items, summary, viewer } = data
  const hasReviews = summary.count > 0
  // Decided by the API, which already compared the session against this provider to
  // judge whether an unlisted page was visible at all.
  const isProviderOwner = Boolean(viewer.isProviderOwner)

  return (
    // `scroll-mt` keeps the heading clear of the sticky header when the pager's
    // `#reviews` fragment lands here — without it the title sits under the bar.
    <section id='reviews' className='scroll-mt-24'>
      <Surface>
        <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
          <AppTitle level='h2' size='h3'>
            {t('title')}
          </AppTitle>

          {/* Owners never see a write CTA: they cannot book themselves, so the API would
            refuse it, and offering a control that always fails is worse than none. */}
          {!isProviderOwner && <WriteReviewButton providerId={providerId} viewer={viewer} />}
        </div>

        {hasReviews ? (
          <>
            <div className='border-brand-border-subtle mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:gap-8'>
              <div className='flex shrink-0 flex-col items-start gap-1'>
                <AppText size='body' as='strong' numeric className='text-h3'>
                  {/* One decimal: `4.3`, never `4.333333`. `toFixed` rather than the
                    i18n formatter because this is a bare numeral beside the stars, not
                    a sentence — and it must read identically in every locale. */}
                  {summary.average.toFixed(1)}
                </AppText>
                <RatingStars
                  value={summary.average}
                  label={t('summaryAria', { rating: summary.average.toFixed(1), count: summary.count })}
                />
                <AppText size='caption' tone='muted'>
                  {t('count', { count: summary.count })}
                </AppText>
              </div>

              <ul className='m-0 flex min-w-0 flex-1 list-none flex-col gap-1 p-0'>
                {STAR_ROWS.map((star) => {
                  const count = summary.distribution[star - 1] ?? 0
                  // Guarded: `count / 0` is NaN, and a NaN width renders as a full bar.
                  const percent = summary.count ? (count / summary.count) * 100 : 0

                  return (
                    <li key={star} className='flex items-center gap-2'>
                      <AppText size='caption' tone='muted' numeric className='w-12 shrink-0'>
                        {t('starCount', { count: star })}
                      </AppText>
                      <span className='bg-brand-100 h-1.5 min-w-0 flex-1 overflow-hidden rounded-full'>
                        {/* Inline width: the value is a datum, not a design decision, and
                          there is no Tailwind class for an arbitrary percentage. */}
                        <span className='bg-rating block h-full rounded-full' style={{ width: `${percent}%` }} />
                      </span>
                      <AppText size='caption' tone='muted' numeric className='w-6 shrink-0 text-end'>
                        {count}
                      </AppText>
                    </li>
                  )
                })}
              </ul>
            </div>

            <ul className='m-0 flex list-none flex-col gap-5 p-0'>
              {items.map((review) => (
                <ReviewCard key={review.id} review={review} isProviderOwner={isProviderOwner} />
              ))}
            </ul>

            {data.pageCount > 1 && (
              <Pagination
                /* `data.page`, not the requested `page`: the API clamps an out-of-range
                 request, so the pager has to render the window that came back. */
                page={data.page}
                pageCount={data.pageCount}
                buildHref={(next) => buildReviewsHref(providerId, next)}
                label={t('pagesLabel')}
                previousLabel={tCommon('previousPage')}
                nextLabel={tCommon('nextPage')}
                pageLabel={(next) => tCommon('pageNumber', { page: next })}
                className='pt-6'
              />
            )}
          </>
        ) : (
          <div className='flex flex-col gap-1'>
            <AppText size='body-sm' as='strong'>
              {t('empty')}
            </AppText>
            <AppParagraph size='body-sm' className='m-0'>
              {t('emptyHint')}
            </AppParagraph>
          </div>
        )}
      </Surface>
    </section>
  )
}
