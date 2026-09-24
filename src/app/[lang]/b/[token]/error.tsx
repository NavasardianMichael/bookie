'use client'

import { useTranslations } from 'next-intl'
import { RouteErrorFallback, RouteErrorProps } from '@components/errors/RouteErrorFallback'

export default function RouteError({ error, retry }: RouteErrorProps) {
  const t = useTranslations('Errors')

  return (
    <RouteErrorFallback
      error={error}
      retry={retry}
      description={t('pages.booking')}
      context='route:booking'
    />
  )
}
