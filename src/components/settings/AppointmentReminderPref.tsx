'use client'

import { FC } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Form, Select, Switch } from 'antd'
import { useTranslations } from 'next-intl'
import { AppointmentReminderLeadMinutes } from '@interfaces/settings'
import { APPOINTMENT_REMINDER_LEAD_MINUTES } from '@constants/settings'
import { cn } from '@helpers/cn'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  showTopBorder?: boolean
}

const LEAD_HOURS: Partial<Record<AppointmentReminderLeadMinutes, number>> = {
  60: 1,
  360: 6,
  1440: 24,
}

/**
 * Appointment Reminders switch plus the lead-time select. The select stays
 * mounted while hidden so antd does not drop `appointmentReminderMinutes`.
 */
export const AppointmentReminderPref: FC<Props> = ({ showTopBorder = false }) => {
  const t = useTranslations('Settings.notifications')
  const remindersOn = Form.useWatch('appointmentReminders') !== false

  const options = APPOINTMENT_REMINDER_LEAD_MINUTES.map((minutes) => {
    const hours = LEAD_HOURS[minutes]
    return {
      value: minutes,
      label: hours === undefined ? t('remindersMinutes', { count: minutes }) : t('remindersHours', { count: hours }),
    }
  })

  return (
    <div className={cn('flex flex-col gap-3 py-4', showTopBorder && 'border-brand-border border-t')}>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <AppText className='font-bold'>{t('remindersTitle')}</AppText>
          <AppParagraph size='body-sm'>{t('remindersBody')}</AppParagraph>
        </div>
        <AppFormItem name='appointmentReminders' valuePropName='checked' className='m-0'>
          <Switch />
        </AppFormItem>
      </div>
      <div className={cn('flex max-w-56 flex-col gap-1.5', !remindersOn && 'hidden')}>
        <FieldLabel htmlFor='appointment-reminder-lead'>{t('remindersLeadLabel')}</FieldLabel>
        <AppFormItem name='appointmentReminderMinutes' className='m-0' hasFeedback={false}>
          <Select<AppointmentReminderLeadMinutes>
            id='appointment-reminder-lead'
            aria-label={t('remindersLeadLabel')}
            options={options}
            className='w-full'
          />
        </AppFormItem>
      </div>
    </div>
  )
}
