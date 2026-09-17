'use client'

import { useTranslations } from 'next-intl'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { HistoryBookingsList } from './HistoryBookingsList'

export const ProviderHistoryClient = () => {
  const t = useTranslations('Settings.history')

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <HistoryBookingsList />
    </div>
  )
}
