import { PageShell } from '@components/ui/layout'

export default function Loading() {
  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <div className='bg-surface-sunken h-10 w-48 animate-pulse rounded-brand' />
      <div className='border-brand-border bg-surface min-h-64 animate-pulse rounded-brand border shadow-sm' />
      <div className='border-brand-border bg-surface min-h-40 animate-pulse rounded-brand border shadow-sm' />
    </PageShell>
  )
}
