'use client'

import { RouteErrorFallback, RouteErrorProps } from '@components/errors/RouteErrorFallback'

export default function RouteError({ error, retry }: RouteErrorProps) {
  return (
    <RouteErrorFallback
      error={error}
      retry={retry}
      context='route'
    />
  )
}
