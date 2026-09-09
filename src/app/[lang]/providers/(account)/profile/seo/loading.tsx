/** Mirrors the panel's three stacked cards: search appearance, keywords, vanity URL. */
export default function ProviderSeoLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <div className='bg-brand-100 h-96 animate-pulse rounded-brand' />
      <div className='bg-brand-100 h-48 animate-pulse rounded-brand' />
      <div className='bg-brand-100 h-56 animate-pulse rounded-brand' />
    </div>
  )
}
