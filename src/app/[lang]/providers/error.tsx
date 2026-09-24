'use client'

import { useTranslations } from 'next-intl'
import { RouteErrorFallback, RouteErrorProps } from '@components/errors/RouteErrorFallback'

export default function RouteError({ error, retry }: RouteErrorProps) {
  const tExplore = useTranslations('Explore')

  return (
    <RouteErrorFallback
      error={error}
      retry={retry}
      description={tExplore('loadError')}
      context='route:providers'
    />
  )
}
