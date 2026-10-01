import { PageShell } from '@components/ui/layout'

/** Mirrors the page — header, the comparison table, two lines of notes. */
export default function PricingLoading() {
  return (
    <PageShell className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <div className='bg-surface-sunken h-8 w-48 animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-4 w-72 animate-pulse rounded-brand' />
      </div>
      <div className='bg-surface-sunken h-80 animate-pulse rounded-brand' />
      <div className='bg-surface-sunken h-10 w-2/3 animate-pulse rounded-brand' />
    </PageShell>
  )
}
