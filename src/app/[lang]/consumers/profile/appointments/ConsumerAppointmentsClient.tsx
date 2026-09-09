'use client'

import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import { useTranslations } from 'next-intl'
import { listAppointmentsAPI } from '@api/appointments/main'
import { AppointmentResponse } from '@api/appointments/types'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

export const ConsumerAppointmentsClient = () => {
  const t = useTranslations('Settings.appointments')
  const [items, setItems] = useState<AppointmentResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void listAppointmentsAPI()
      .then((all) => {
        const now = Date.now()
        setItems(
          all.filter(
            (a) =>
              new Date(a.time.startDate).getTime() >= now &&
              a.status !== 'cancelled' &&
              a.status !== 'completed' &&
              a.status !== 'no_show'
          )
        )
      })
      .catch((err) => setError(processError(err).message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <AppTitle level='h2' size='h3'>
            {t('upcoming')}
          </AppTitle>
        </div>

        {loading ? (
          <div className='bg-brand-50 min-h-32 animate-pulse rounded-brand' />
        ) : items.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
        ) : (
          <ul className='flex flex-col gap-3'>
            {items.map((item) => {
              const providerName = item.provider
                ? `${item.provider.basic.firstName} ${item.provider.basic.lastName}`.trim()
                : t('unknownProvider')
              const when = new Date(item.time.startDate)
              return (
                <li
                  key={item.id}
                  className='border-brand-border hover:bg-surface-sunken flex items-center gap-4 rounded-brand border p-3 transition-colors'
                >
                  <AppAvatar
                    src={item.provider?.basic.image}
                    name={providerName}
                    size={48}
                    shape='square'
                  />
                  <div className='min-w-0 flex-1'>
                    <AppText size='caption' className='text-brand font-bold'>
                      {when.toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </AppText>
                    <AppParagraph className='font-bold' tone='default'>
                      {providerName}
                    </AppParagraph>
                    <AppText size='caption' tone='muted'>
                      {item.service?.name ?? t('unknownService')}
                    </AppText>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <AppLink href={ROUTES.providers} variant='button' tone='primary' className='w-full max-w-xs'>
          {t('bookService')}
        </AppLink>
      </Surface>
    </div>
  )
}
