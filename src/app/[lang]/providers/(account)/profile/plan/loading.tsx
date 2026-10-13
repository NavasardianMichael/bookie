import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'

/** Mirrors the panel's stacking — header, three stat cards, the comparison table. */
export default function ProviderPlanLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <ResponsiveGrid min='sm'>
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
      </ResponsiveGrid>
      <div className='bg-brand-100 h-72 animate-pulse rounded-brand' />
    </div>
  )
}
