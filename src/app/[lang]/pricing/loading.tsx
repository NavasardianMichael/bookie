import { PageShell } from '@components/ui/layout'

/** Mirrors the page — header, the comparison table and its notes, what every plan includes, the FAQ. */
export default function PricingLoading() {
  return (
    <PageShell className='flex flex-col gap-10'>
      <div className='flex flex-col gap-2'>
        <div className='bg-surface-sunken h-8 w-48 animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-4 w-72 animate-pulse rounded-brand' />
      </div>
      <div className='flex flex-col gap-3'>
        <div className='bg-surface-sunken h-112 animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-10 w-2/3 animate-pulse rounded-brand' />
      </div>
      <div className='bg-surface-sunken h-48 animate-pulse rounded-brand' />
      <div className='bg-surface-sunken h-96 animate-pulse rounded-brand' />
    </PageShell>
  )
}
