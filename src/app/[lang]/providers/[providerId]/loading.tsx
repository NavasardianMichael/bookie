import { PageShell } from '@components/ui/layout'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'

export default function Loading() {
  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <div className='flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]'>
        <div className='border-brand-border bg-surface flex flex-col items-center gap-4 rounded-brand border p-6 shadow-sm'>
          <div className='bg-surface-sunken size-32 animate-pulse rounded-full' />
          <div className='bg-surface-sunken h-7 w-40 animate-pulse rounded-brand' />
          <div className='bg-surface-sunken h-16 w-full animate-pulse rounded-brand' />
        </div>
        <div className='border-brand-border bg-surface min-h-80 animate-pulse rounded-brand border shadow-sm' />
      </div>
      <CardGridSkeleton count={3} min='sm' />
    </PageShell>
  )
}
