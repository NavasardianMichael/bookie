'use client'

import { useEffect } from 'react'
import { ErrorState } from '@components/ui/ErrorState'
import { PageShell } from '@components/ui/layout'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      <ErrorState
        description='We could not load the organizations list. Please try again.'
        digest={error.digest}
        onRetry={reset}
      />
    </PageShell>
  )
}
