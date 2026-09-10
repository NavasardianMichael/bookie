'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ErrorState } from '@components/ui/ErrorState'
import { PageShell } from '@components/ui/layout'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Organizations')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      <ErrorState description={t('loadError')} digest={error.digest} onRetry={reset} />
    </PageShell>
  )
}
