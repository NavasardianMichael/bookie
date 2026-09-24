'use client'

import { useTranslations } from 'next-intl'
import { RouteErrorFallback, RouteErrorProps } from '@components/errors/RouteErrorFallback'

export default function RouteError({ error, retry }: RouteErrorProps) {
  const tOrganizations = useTranslations('Organizations')

  return (
    <RouteErrorFallback
      error={error}
      retry={retry}
      description={tOrganizations('loadError')}
      context='route:organizations'
    />
  )
}
