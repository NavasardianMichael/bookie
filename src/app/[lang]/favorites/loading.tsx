import { PageShell } from '@components/ui/layout'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'

/** Mirrors the page — heading, subtitle, then the grid — so the handoff costs no layout shift. */
export default function FavoritesLoading() {
  return (
    <PageShell className='flex flex-col gap-8'>
      <div className='flex flex-col gap-2'>
        <div className='bg-surface-sunken h-10 w-56 animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-5 w-80 max-w-full animate-pulse rounded-brand' />
      </div>
      <CardGridSkeleton count={6} aspect='16/9' />
    </PageShell>
  )
}
