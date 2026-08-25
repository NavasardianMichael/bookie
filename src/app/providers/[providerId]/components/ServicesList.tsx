import { FC } from 'react'
import { ProviderService } from '@store/providers/profile/types'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import AppParagraph from '@components/ui/bare/AppParagraph'
import AppText from '@components/ui/bare/AppText'
import AppTime from '@components/ui/bare/AppTime'
import AppTitle from '@components/ui/bare/AppTitle'
import ResponsiveGrid from '@components/ui/layout/ResponsiveGrid'

type Props = {
  services: ProviderService[]
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
const ServicesList: FC<Props> = ({ services }) => {
  if (!services.length) return null

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

export default ServicesList
