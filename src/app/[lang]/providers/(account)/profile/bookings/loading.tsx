/**
 * Mirrors the panel's own stacking — header, stat row, calendar, list — so the
 * skeleton-to-content handoff costs no layout shift. The group's `loading.tsx` covers
 * the sidebar; this one only stands in for the panel beside it.
 */
export default function ProviderBookingsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='bg-brand-100 h-24 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-24 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-24 animate-pulse rounded-brand' />
      </div>
      <div className='bg-brand-100 h-96 animate-pulse rounded-brand' />
      <div className='bg-brand-100 min-h-64 animate-pulse rounded-brand' />
    </div>
  )
}
