/**
 * Mirrors the panel's own stacking — header, calendar, list — so the
 * skeleton-to-content handoff costs no layout shift. The group's `loading.tsx` covers
 * the sidebar; this one only stands in for the panel beside it.
 */
export default function ProviderConsumerBookingsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <div className='bg-brand-100 h-96 animate-pulse rounded-brand' />
      <div className='bg-brand-100 min-h-64 animate-pulse rounded-brand' />
    </div>
  )
}
