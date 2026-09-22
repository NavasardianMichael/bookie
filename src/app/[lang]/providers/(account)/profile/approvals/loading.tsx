/**
 * Mirrors the panel's stacking — header, setting card, queue — so the
 * skeleton-to-content handoff costs no layout shift. The route group's own
 * `loading.tsx` covers the sidebar beside it.
 */
export default function ProviderApprovalsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand-100 h-16 w-64 animate-pulse rounded-brand' />
      <div className='bg-brand-100 h-40 animate-pulse rounded-brand' />
      <div className='bg-brand-100 min-h-64 animate-pulse rounded-brand' />
    </div>
  )
}
