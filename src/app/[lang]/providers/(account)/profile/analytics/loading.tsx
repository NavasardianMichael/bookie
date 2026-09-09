/** Mirrors the panel's stacking — header, stat row, one wide chart, two half charts. */
export default function ProviderAnalyticsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
      </div>
      <div className='bg-brand-100 h-72 animate-pulse rounded-brand' />
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='bg-brand-100 h-64 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-64 animate-pulse rounded-brand' />
      </div>
    </div>
  )
}
