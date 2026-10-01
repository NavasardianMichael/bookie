'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSingleProviderStore } from '@store/providers/single/store'
import { SingleProvider } from '@store/providers/single/types'
import { BookingClosedReason } from '@interfaces/booking'
import { isOnlineBookingOpen } from '@helpers/booking'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { Surface } from '@components/ui/layout/Surface'
import { BookingClosedNotice } from './BookingClosedNotice'
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
  const t = useTranslations('Booking')
  const providerStore = useSingleProviderStore()

  const services = useMemo(
    () => initialState.services.allIds.map((id) => initialState.services.byId[id]).filter(Boolean),
    [initialState.services]
  )

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(() => services[0]?.id)

  /**
   * Seeded from the payload, and closed locally when a submit is refused because the
   * provider paused or ran out of allowance while this page was open — so the visitor is
   * moved to the contact notice rather than left with a calendar that cannot book.
   */
  const [closedReason, setClosedReason] = useState<BookingClosedReason | undefined>(() => {
    const { onlineBooking } = initialState.details
    return isOnlineBookingOpen(onlineBooking) ? undefined : onlineBooking
  })

  const { basic, details } = initialState
  const phone = details.phone ? generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' }) : undefined

  useEffect(() => {
    providerStore.setSingleProviderState(JSON.parse(JSON.stringify(initialState)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {!!services.length && (
        <Surface>
          {/* The picker stays when booking is closed: it is the page's only list of what
              this provider offers, and that is still worth reading before phoning them. */}
          <div className='mb-5'>
            <AppTitle level='h3' size='h3'>
              {closedReason ? t('closed.servicesTitle') : t('chooseService')}
            </AppTitle>
            {!closedReason && (
              <AppParagraph size='body-sm' className='m-0'>
                {t('chooseServiceHint')}
              </AppParagraph>
            )}
          </div>

          <ServicePicker services={services} value={selectedServiceId} onChange={setSelectedServiceId} />
        </Surface>
      )}

      {closedReason ? (
        <BookingClosedNotice
          reason={closedReason}
          providerName={`${basic.firstName} ${basic.lastName}`.trim()}
          phone={phone}
          email={details.email}
        />
      ) : (
        <BookingPanel selectedServiceId={selectedServiceId} onBookingClosed={setClosedReason} />
      )}
    </>
  )
}
