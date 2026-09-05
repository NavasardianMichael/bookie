'use client'

import { FC, ReactNode, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { ROUTE_KEYS } from '@constants/routes'
import { CONSUMER_SETTINGS_NAV, toSettingsNavItems } from '@constants/settings'
import { AccountSettingsLayout } from '@components/settings/AccountSettingsLayout'
import { BellIcon, CalendarIcon, CreditCardIcon, PhoneIcon, UserIcon } from '@components/ui/icons'

type Props = {
  children: ReactNode
}

export const ConsumerSettingsLayoutClient: FC<Props> = ({ children }) => {
  const t = useTranslations('Settings')
  const firstName = useAuthStore.use.firstName()
  const lastName = useAuthStore.use.lastName()
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || t('consumerAccount')

  const items = useMemo(
    () =>
      toSettingsNavItems(
        CONSUMER_SETTINGS_NAV,
        {
          [ROUTE_KEYS.consumerProfile]: t('nav.profile'),
          [ROUTE_KEYS.consumerProfilePhone]: t('nav.phone'),
          [ROUTE_KEYS.consumerProfileAppointments]: t('nav.appointments'),
          [ROUTE_KEYS.consumerProfileNotifications]: t('nav.notifications'),
          [ROUTE_KEYS.consumerProfilePayments]: t('nav.payments'),
        },
        {
          [ROUTE_KEYS.consumerProfile]: <UserIcon className='h-5 w-5' />,
          [ROUTE_KEYS.consumerProfilePhone]: <PhoneIcon className='h-5 w-5' />,
          [ROUTE_KEYS.consumerProfileAppointments]: <CalendarIcon className='h-5 w-5' />,
          [ROUTE_KEYS.consumerProfileNotifications]: <BellIcon className='h-5 w-5' />,
          [ROUTE_KEYS.consumerProfilePayments]: <CreditCardIcon className='h-5 w-5' />,
        }
      ),
    [t]
  )

  return (
    <AccountSettingsLayout
      accountRole='consumer'
      items={items}
      title={t('accountSettings')}
      accountLabel={t('consumerAccount')}
      displayName={displayName}
    >
      {children}
    </AccountSettingsLayout>
  )
}
