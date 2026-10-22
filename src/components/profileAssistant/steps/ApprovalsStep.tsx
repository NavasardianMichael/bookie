'use client'

import { FC } from 'react'
import { Switch } from 'antd'
import { useTranslations } from 'next-intl'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'

/** The Approvals tab's one setting. The queue itself is not the assistant's to fill. */
export const ApprovalsStep: FC = () => {
  const t = useTranslations('Settings.approvals')

  return (
    <div className='bg-surface-sunken border-brand-border flex items-center justify-between gap-4 rounded-brand border p-4'>
      <div>
        <AppText className='font-bold'>{t('switchTitle')}</AppText>
        <AppParagraph size='body-sm' className='m-0'>
          {t('switchBody')}
        </AppParagraph>
      </div>
      <AppFormItem name='requiresBookingApproval' valuePropName='checked' className='m-0'>
        <Switch aria-label={t('switchTitle')} />
      </AppFormItem>
    </div>
  )
}
