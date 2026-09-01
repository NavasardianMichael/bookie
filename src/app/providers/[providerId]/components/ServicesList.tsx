import { FC } from 'react'
import Image from 'next/image'
import { ProviderService } from '@store/providers/profile/types'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import { resolveAssetUrl } from '@helpers/images'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ScissorsIcon } from '@components/ui/icons'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'

type Props = {
  services: ProviderService[]
  /** `stack` is the compact sidebar list on the public profile. */
  variant?: 'grid' | 'stack'
}

/**
 * The provider's offering, rendered on the server.
 *
 * The same list already reaches the client Calendar, but only as Segmented option
 * labels read from a store that is hydrated in an effect — so on the server pass
 * the store is still empty and nothing about what a provider actually offers, nor
 * any price, appeared in the HTML. This is the page's highest-intent content, so
 * it is also the content most worth having a crawler read.
 */
export const ServicesList: FC<Props> = ({ services, variant = 'grid' }) => {
  if (!services.length) return null

  if (variant === 'stack') {
    return (
      <ul className='m-0 list-none divide-y divide-brand-border-subtle p-0'>
        {services.map((service) => {
          const resolvedImage = resolveAssetUrl(service.image)

          return (
            <li key={service.id} className='flex items-center justify-between gap-3 p-4'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='bg-brand-50 relative size-10 shrink-0 overflow-hidden rounded-brand-sm'>
                  {resolvedImage ? (
                    <Image src={resolvedImage} alt='' fill sizes='40px' className='object-cover' />
                  ) : (
                    <span className='text-brand-400 flex h-full w-full items-center justify-center'>
                      <ScissorsIcon className='h-4 w-4' />
                    </span>
                  )}
                </div>
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <AppTitle level='h3' size='h3' className='line-clamp-1'>
                    {service.name}
                  </AppTitle>
                  <AppTime dateTime={toIsoDuration(service.duration)} className='text-caption'>
                    {formatDuration(service.duration)}
                  </AppTime>
                </div>
              </div>
              {service.price !== undefined && service.currency && (
                <AppText size='body-sm' tone='default' numeric className='shrink-0 font-bold'>
                  {service.price} {service.currency}
                </AppText>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ResponsiveGrid as='ul' min='sm'>
      {services.map((service) => (
        <li
          key={service.id}
          className='border-brand-border bg-surface flex flex-col gap-1 rounded-brand border p-3 sm:p-4'
        >
          <AppTitle level='h3'>{service.name}</AppTitle>

          <p className='flex flex-wrap items-center gap-x-2'>
            <AppTime dateTime={toIsoDuration(service.duration)} className='text-body-sm'>
              {formatDuration(service.duration)}
            </AppTime>
            {service.price !== undefined && service.currency && (
              <>
                <AppText aria-hidden='true'>·</AppText>
                <AppText size='body-sm' tone='default' numeric className='font-semibold'>
                  {service.price} {service.currency}
                </AppText>
              </>
            )}
          </p>

          {service.description && <AppParagraph size='body-sm'>{service.description}</AppParagraph>}
        </li>
      ))}
    </ResponsiveGrid>
  )
}
