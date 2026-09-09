'use client'

import { FC, ReactNode, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ROUTE_KEYS } from '@constants/routes'
import { PROVIDER_SETTINGS_NAV, toSettingsNavItems } from '@constants/settings'
import { AccountSettingsLayout } from '@components/settings/AccountSettingsLayout'
import {
  BellIcon,
  CalendarIcon,
  ChartIcon,
  ClockIcon,
  CreditCardIcon,
  GlobeIcon,
  ListIcon,
  UserIcon,
} from '@components/ui/icons'

type Props = {
  children: ReactNode
}

export const ProviderSettingsLayoutClient: FC<Props> = ({ children }) => {
  const t = useTranslations('Settings')

  const items = useMemo(
    () =>
      toSettingsNavItems(
        PROVIDER_SETTINGS_NAV,
        {
          [ROUTE_KEYS.providerProfile]: t('nav.profile'),
          [ROUTE_KEYS.providerProfileBookings]: t('nav.bookings'),
          [ROUTE_KEYS.providerProfileAnalytics]: t('nav.analytics'),
          [ROUTE_KEYS.providerProfileAvailability]: t('nav.availability'),
          [ROUTE_KEYS.providerServices]: t('nav.services'),
          [ROUTE_KEYS.providerProfileSeo]: t('nav.seo'),
          [ROUTE_KEYS.providerProfileNotifications]: t('nav.notifications'),
          [ROUTE_KEYS.providerProfilePayments]: t('nav.payments'),
        },
        {
          [ROUTE_KEYS.providerProfile]: <UserIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileBookings]: <CalendarIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileAnalytics]: <ChartIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileAvailability]: <ClockIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerServices]: <ListIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileSeo]: <GlobeIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileNotifications]: <BellIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfilePayments]: <CreditCardIcon className='h-5 w-5' />,
        }
      ),
    [t]
  )

  return (
    <AccountSettingsLayout
      accountRole='provider'
      items={items}
      title={t('settings')}
      subtitle={t('providerSubtitle')}
    >
      {children}
    </AccountSettingsLayout>
  )
}
