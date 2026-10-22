'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { ProviderProfileTimeZone } from '@components/settings/ProviderProfileTimeZone'
import { TimeFormatToggle } from '@components/settings/TimeFormatToggle'
import { AppFormItem } from '@components/ui/AppFormItem'

/** The Advanced settings tab's clock: the zone the hours are in, and 12- or 24-hour. */
export const AdvancedStep: FC = () => {
  const t = useTranslations('Settings.availability')

  return (
    <div className='flex flex-col gap-4 [&_.ant-form-item-label>label]:font-semibold'>
      <AppFormItem name='timeZone' label={t('timeZone')} extra={t('timeZoneHint')} layout='vertical'>
        <ProviderProfileTimeZone />
      </AppFormItem>
      <AppFormItem name='timeFormat' label={t('timeFormat')} extra={t('timeFormatHint')} layout='vertical'>
        <TimeFormatToggle />
      </AppFormItem>
    </div>
  )
}
