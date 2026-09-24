'use client'

import { FC, useEffect, useState } from 'react'
import { Segmented } from 'antd'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { BookingsSide } from './BookingsList'
import { BookingsSkeleton } from './BookingsSkeleton'
import { ConsumerAppointmentsClient } from './ConsumerAppointmentsClient'
import { ProviderBookingsClient } from './ProviderBookingsClient'

/**
 * `/bookings`: every appointment on the account, from whichever side it holds.
 *
 * It replaced two settings tabs — the provider workspace's Bookings and the consumer
 * profile's Appointments — because a list opened every day does not belong behind the
 * page you open to change a password. The panels are the ones those tabs rendered.
 *
 * **Which list is the session's call, not the URL's.**
 *
 * - A consumer session gets `ConsumerAppointmentsClient`, over `GET /appointments`.
 * - A provider session gets the calendar over the bookings made *with* them. If the account
 *   also holds a Consumer profile — booking anyone creates one — a switch offers the
 *   bookings it made as a client, which is what the orphaned
 *   `/providers/profile/consumer-bookings` used to show with no link to it.
 *
 * The switch is local state, like every filter below it: the page is private and fetches
 * for itself, so a URL for it would buy a shareable link nobody else can open.
 */
export const BookingsClient: FC = () => {
  const t = useTranslations('Bookings')
  const tBookings = useTranslations('Settings.bookings')
  const tAppointments = useTranslations('Settings.appointments')
  const { replace } = useRouter()
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const profiles = useAuthStore.use.profiles()
  const getMe = useAuthStore.use.getMe()
  const [side, setSide] = useState<BookingsSide>('provider')

  /**
   * `src/proxy.ts` has already bounced a visitor with no cookie. This catches the cookie
   * that is present but no longer honoured, and resolves the role on a hard load — the same
   * guard `AccountSettingsLayout` runs.
   */
  useEffect(() => {
    if (isSignedOn) return
    let cancelled = false

    void getMe().then((session) => {
      if (!cancelled && !session) replace(ROUTES.signIn)
    })

    return () => {
      cancelled = true
    }
  }, [getMe, isSignedOn, replace])

  if (!isSignedOn || !userType) return <BookingsSkeleton />

  const isProvider = userType === USER_TYPES.provider
  // `profiles` is absent on a payload minted before it shipped; that reads as "no switch",
  // the old behaviour, rather than offering a view that may not exist.
  const canSwitch = isProvider && Boolean(profiles?.consumer)
  const providerSide: BookingsSide = canSwitch ? side : 'provider'

  const subtitle = !isProvider
    ? tAppointments('subtitle')
    : providerSide === 'consumer'
      ? tBookings('asConsumerSubtitle')
      : tBookings('subtitle')

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title={t('title')}
        subtitle={subtitle}
        actions={
          canSwitch ? (
            <Segmented<BookingsSide>
              aria-label={t('viewLabel')}
              value={providerSide}
              onChange={setSide}
              options={[
                { value: 'provider', label: t('views.provider') },
                { value: 'consumer', label: t('views.consumer') },
              ]}
            />
          ) : undefined
        }
      />

      {isProvider ? (
        // Keyed so a switch starts the other view fresh: its service filter lists a
        // different catalogue, and a day picked on one calendar means nothing on the other.
        <ProviderBookingsClient key={providerSide} side={providerSide} />
      ) : (
        <ConsumerAppointmentsClient />
      )}
    </div>
  )
}
