/** Mirrors the panel's stacking — header, current plan, two usage tiles, the comparison table. */
export default function ProviderPlanLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <div className='bg-brand-100 h-24 animate-pulse rounded-brand' />
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
      </div>
      <div className='bg-brand-100 h-72 animate-pulse rounded-brand' />
    </div>
  )
}
