import { FC } from 'react'
import { buildServiceHref } from '@app/[lang]/p/[slug]/components/serviceParams'
import { getTranslations } from 'next-intl/server'
import { MatchedService } from '@store/providers/list/types'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import { ProviderPageRef } from '@helpers/entities'
import { APP_LINK_META_CLASS, AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'

type Props = {
  provider: ProviderPageRef
  service: MatchedService
  /** Other services that matched too — the "+N more" link to the full list. */
  more?: number
}

/**
 * The service an Explore search matched on this provider, linked straight into booking it.
 * Rendered only when a service is what the search found, so a provider found by name keeps
 * the plain card. One service rather than every match keeps the grid's cards one height;
 * the rest are a count that opens the provider's own list.
 */
export const MatchedServiceLink: FC<Props> = async ({ provider, service, more }) => {
  const t = await getTranslations('Explore')

  return (
    <div className='flex flex-col items-start gap-1.5'>
      <AppLink
        href={buildServiceHref(provider, service.id)}
        variant='unstyled'
        className='border-brand-border bg-brand-50 hover:border-brand flex w-full flex-col gap-0.5 rounded-brand-sm border px-3 py-2 transition-colors'
      >
        {/* Ahead of the visible text, so the link's name still starts with what it shows. */}
        <span className='sr-only'>{t('matchedService')} </span>
        <AppText as='strong' size='body-sm' tone='default' className='line-clamp-1 font-semibold'>
          {service.name}
        </AppText>
        <span className='flex flex-wrap items-center gap-x-2'>
          <AppTime dateTime={toIsoDuration(service.duration)} className='text-caption'>
            {formatDuration(service.duration)}
          </AppTime>
          {service.price !== undefined && service.currency && (
            <>
              <AppText aria-hidden='true' size='caption'>
                ·
              </AppText>
              <AppText size='caption' tone='default' numeric className='font-semibold'>
                {service.price} {service.currency}
              </AppText>
            </>
          )}
        </span>
      </AppLink>

      {!!more && (
        <AppLink href={buildServiceHref(provider)} variant='plain' className={APP_LINK_META_CLASS}>
          {t('moreMatchingServices', { count: more })}
        </AppLink>
      )}
    </div>
  )
}
