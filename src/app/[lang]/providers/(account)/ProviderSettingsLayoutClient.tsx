'use client'

import { FC, ReactNode, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ROUTE_KEYS } from '@constants/routes'
import { PROVIDER_SETTINGS_NAV, toSettingsNavItems } from '@constants/settings'
import { AccountSettingsLayout } from '@components/settings/AccountSettingsLayout'
import {
  BellIcon,
  ClockIcon,
  CreditCardIcon,
  EyeIcon,
  ListIcon,
  PhoneIcon,
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
          [ROUTE_KEYS.providerProfilePhone]: t('nav.phone'),
          [ROUTE_KEYS.providerProfileAvailability]: t('nav.availability'),
          [ROUTE_KEYS.providerServices]: t('nav.services'),
          [ROUTE_KEYS.providerProfileNotifications]: t('nav.notifications'),
          [ROUTE_KEYS.providerProfilePayments]: t('nav.payments'),
          [ROUTE_KEYS.providerProfileListing]: t('nav.listing'),
        },
        {
          [ROUTE_KEYS.providerProfile]: <UserIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfilePhone]: <PhoneIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileAvailability]: <ClockIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerServices]: <ListIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileNotifications]: <BellIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfilePayments]: <CreditCardIcon className='h-5 w-5' />,
          [ROUTE_KEYS.providerProfileListing]: <EyeIcon className='h-5 w-5' />,
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
