'use client'

import { FC, useTransition } from 'react'
import { useRouter } from '@i18n/navigation'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  /** Translated by the Server Component that renders it — usually `Common.tryAgain`. */
  label: string
}

/**
 * Retry for a Server Component that failed inline rather than throwing to a boundary:
 * `router.refresh()` re-renders the route's server tree, so the failed fetch runs again
 * while everything already on screen — and every client island's state — stays put.
 */
export const RefreshButton: FC<Props> = ({ label }) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <AppButton size='small' loading={isPending} onClick={() => startTransition(() => router.refresh())}>
      {label}
    </AppButton>
  )
}
