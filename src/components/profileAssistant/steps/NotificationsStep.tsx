'use client'

import { FC } from 'react'
import { Switch } from 'antd'
import { useTranslations } from 'next-intl'
import { AppointmentReminderPref } from '@components/settings/AppointmentReminderPref'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'

const SWITCHES = [
  { name: 'bookingChanges', titleKey: 'changesTitle', bodyKey: 'changesBody' },
  { name: 'newBooking', titleKey: 'newBookingTitle', bodyKey: 'newBookingBody' },
] as const

/** The Notifications tab's emails. Telegram and the calendar feed need linking on the tab. */
export const NotificationsStep: FC = () => {
  const t = useTranslations('Settings.notifications')

  return (
    <div className='divide-brand-border flex flex-col divide-y'>
      <AppointmentReminderPref />
      {SWITCHES.map(({ name, titleKey, bodyKey }) => (
        <div key={name} className='flex items-center justify-between gap-4 py-4'>
          <div>
            <AppText className='font-bold'>{t(titleKey)}</AppText>
            <AppParagraph size='body-sm' className='m-0'>
              {t(bodyKey)}
            </AppParagraph>
          </div>
          <AppFormItem name={name} valuePropName='checked' className='m-0'>
            <Switch aria-label={t(titleKey)} />
          </AppFormItem>
        </div>
      ))}
    </div>
  )
}
