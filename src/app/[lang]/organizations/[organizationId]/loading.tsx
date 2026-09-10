import { PageShell, Surface } from '@components/ui/layout'

/**
 * Mirrors the detail page's own shape — a `Surface` holding the `PageHeader` (square
 * avatar, title, subtitle, category chips, contact actions) over the `<dl>` — so the
 * skeleton→content handoff costs no layout shift.
 */
export default function Loading() {
  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <Surface>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6'>
          {/* `size={72}` square, matching the real AppAvatar. */}
          <div className='bg-surface-sunken size-18 shrink-0 animate-pulse rounded-brand' />

          <div className='flex min-w-0 flex-1 flex-col gap-3'>
            <div className='bg-surface-sunken h-8 w-64 max-w-full animate-pulse rounded-brand' />
            <div className='bg-surface-sunken h-4 w-full max-w-md animate-pulse rounded-brand' />

            {/* Category chips — `h-8` is the chip height the page sets explicitly. */}
            <div className='flex flex-wrap gap-2'>
              <div className='bg-surface-sunken h-8 w-24 animate-pulse rounded-brand' />
              <div className='bg-surface-sunken h-8 w-20 animate-pulse rounded-brand' />
            </div>
          </div>

          <div className='bg-surface-sunken h-10 w-full animate-pulse rounded-brand sm:w-44' />
        </div>
      </Surface>

      {/* The description list: hairline-separated rows, single column below md. */}
      <div className='border-brand-border bg-brand-border grid gap-px overflow-hidden rounded-brand border md:grid-cols-2'>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className='bg-surface flex flex-col gap-2 p-3 sm:flex-row sm:gap-4'>
            <div className='bg-surface-sunken h-4 w-24 shrink-0 animate-pulse rounded-brand sm:w-28' />
            <div className='bg-surface-sunken h-4 w-40 max-w-full animate-pulse rounded-brand' />
          </div>
        ))}
      </div>
    </PageShell>
  )
}
