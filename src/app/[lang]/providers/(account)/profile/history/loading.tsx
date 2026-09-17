/** Mirrors the panel — header, search row, list. */
export default function ProviderHistoryLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <div className='bg-brand-100 min-h-64 animate-pulse rounded-brand' />
    </div>
  )
}
