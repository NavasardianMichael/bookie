'use client'

import { FC, useEffect } from 'react'
import { reportError } from '@helpers/reportError'
import { ErrorState } from '@components/ui/ErrorState'
import { PageShell } from '@components/ui/layout'

/** What Next passes an `error.tsx` (and `global-error.tsx`). */
export type RouteErrorProps = {
  error: Error & { digest?: string }
  /**
   * Re-fetches and re-renders the segment — stable since Next 16.3. `reset` only
   * re-renders, so a boundary wired to it could never recover from a failed fetch.
   */
  retry: () => void
}

export type RouteErrorFallbackProps = RouteErrorProps & {
  /** What this segment could not load, from `Errors.pages.*`. */
  description?: string
  /** Names the boundary in the report, so a log line says where it was caught. */
  context: string
  /**
   * Renders inside an existing shell (the account settings sidebar) instead of claiming
   * the whole page. A boundary renders inside its own segment's layout, so the shell is
   * still on screen around it.
   */
  inline?: boolean
}

/** The body of every `error.tsx`. */
export const RouteErrorFallback: FC<RouteErrorFallbackProps> = ({ error, retry, description, context, inline }) => {
  useEffect(() => {
    reportError(error, context)
  }, [context, error])

  const state = <ErrorState error={error} digest={error.digest} description={description} onRetry={retry} />

  if (inline) return state

  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      {state}
    </PageShell>
  )
}
