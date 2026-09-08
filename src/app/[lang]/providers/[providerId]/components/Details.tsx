'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useSingleProviderStore } from '@store/providers/single/store'
import { SingleProvider } from '@store/providers/single/types'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { Surface } from '@components/ui/layout/Surface'
import { BookingPanel } from './BookingPanel'
import { ServicePicker } from './ServicePicker'

type Props = {
  initialState: SingleProvider
}

/**
 * Booking, as three stacked panels: service, day, time — the order
 * `public_provider_profile` reads in.
 *
 * One "Book an appointment" card used to hold a service strip, a view switcher
 * and a month grid, with the times themselves behind a modal opened by a day
 * click. The selection lives here — above every panel — because the service
 * picker sets it and the day grid's slot stepping consumes it.
 *
 * `initialState` feeds the picker directly instead of the store: the store is
 * hydrated in an effect below, so during the server render and the first client
 * paint it is still empty, and a list read from it would flash in.
 */
export const ProviderDetails: FC<Props> = ({ initialState }) => {
  const providerStore = useSingleProviderStore()

  const services = useMemo(
    () => initialState.services.allIds.map((id) => initialState.services.byId[id]).filter(Boolean),
    [initialState.services]
  )

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(() => services[0]?.id)

  useEffect(() => {
    providerStore.setSingleProviderState(JSON.parse(JSON.stringify(initialState)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {!!services.length && (
        <Surface>
          <div className='mb-5 flex flex-wrap items-end justify-between gap-2'>
            <div>
              <AppTitle level='h3' size='h3'>
                Choose a service
              </AppTitle>
              <AppParagraph size='body-sm' className='m-0'>
                Its duration sets the length of every slot offered below.
              </AppParagraph>
            </div>
            <AppText size='overline' tone='muted'>
              {services.length} {services.length === 1 ? 'option' : 'options'}
            </AppText>
          </div>

          <ServicePicker services={services} value={selectedServiceId} onChange={setSelectedServiceId} />
        </Surface>
      )}

      <BookingPanel selectedServiceId={selectedServiceId} />
    </>
  )
}
