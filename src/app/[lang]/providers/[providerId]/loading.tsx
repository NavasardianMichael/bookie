/**
 * The booking column only. The identity column is the segment layout, which this
 * fallback does not wrap — a skeleton there would put the name and links behind
 * the hidden Suspense swap.
 */
export default function Loading() {
  return (
    <>
      <div className='border-brand-border bg-surface min-h-40 animate-pulse rounded-brand border shadow-sm' />
      <div className='border-brand-border bg-surface min-h-96 animate-pulse rounded-brand border shadow-sm' />
      <div className='border-brand-border bg-surface min-h-64 animate-pulse rounded-brand border shadow-sm' />
    </>
  )
}
