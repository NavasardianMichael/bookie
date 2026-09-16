import { FC } from 'react'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Review } from '@store/reviews/list/types'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { RatingStars } from '@components/ui/bare/RatingStars'
import { ReviewCardActions } from './ReviewCardActions'

type Props = {
  review: Review
  /** The viewer owns this provider's page, so they may reply and report. */
  isProviderOwner: boolean
}

/**
 * One review: stars, author, date, body, and the provider's reply beneath it.
 *
 * A **Server Component**, which is the point — the review text is in the HTML a crawler
 * and an LLM reader see, rather than arriving through hydration. Only the controls are a
 * client island (`ReviewCardActions`), because only they need state.
 */
export const ReviewCard: FC<Props> = async ({ review, isProviderOwner }) => {
  const [t, format] = await Promise.all([getTranslations('Provider.reviews'), getFormatter()])

  /**
   * next-intl's `Intl`-backed formatter, never `dayjs`. `dayjs.locale()` sets a module
   * global, so calling it on the server lets two concurrent requests in different
   * languages race — see `src/i18n/CLAUDE.md`.
   */
  const written = format.dateTime(new Date(review.createdAt), { dateStyle: 'medium' })

  return (
    <li className='border-brand-border-subtle flex flex-col gap-2 border-t pt-5 first:border-t-0 first:pt-0'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <RatingStars value={review.rating} size='sm' label={t('ratingAria', { rating: review.rating })} />
          <AppText size='body-sm' as='strong'>
            {review.author}
          </AppText>
          <AppText size='caption' tone='muted'>
            <AppTime dateTime={review.createdAt}>{written}</AppTime>
          </AppText>
          {/* `updatedAt` is present only when it differs from `createdAt`, so this needs
              no comparison of its own — the server already made that call. */}
          {review.updatedAt && (
            <AppText size='caption' tone='muted'>
              · {t('edited')}
            </AppText>
          )}
        </div>

        <ReviewCardActions review={review} isProviderOwner={isProviderOwner} />
      </div>

      {review.comment && (
        <AppParagraph size='body-sm' tone='default' className='m-0 whitespace-pre-wrap'>
          {review.comment}
        </AppParagraph>
      )}

      {review.reply && (
        <div className='border-brand-200 bg-brand-50 rounded-brand-sm mt-1 border-s-2 px-3 py-2'>
          <AppText size='caption' as='strong' tone='brand'>
            {t('replyFrom')}
          </AppText>
          <AppParagraph size='body-sm' tone='default' className='m-0 mt-1 whitespace-pre-wrap'>
            {review.reply}
          </AppParagraph>
        </div>
      )}
    </li>
  )
}
