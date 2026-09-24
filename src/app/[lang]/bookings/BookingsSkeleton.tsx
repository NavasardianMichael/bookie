import { FC } from 'react'

/**
 * Header, calendar, list — the page's own stacking, so the handoff costs no layout shift.
 * Shared by `loading.tsx` and `BookingsClient`'s wait for the session, which decides which
 * list to show and therefore cannot render one before it answers.
 */
export const BookingsSkeleton: FC = () => (
  <div className='flex flex-col gap-6' aria-hidden='true'>
    <div className='flex flex-col gap-2'>
      <div className='bg-brand-100 h-10 w-48 animate-pulse rounded-brand' />
      <div className='bg-brand-100 h-5 w-80 max-w-full animate-pulse rounded-brand' />
    </div>
    <div className='bg-brand-100 h-96 animate-pulse rounded-brand' />
    <div className='bg-brand-100 min-h-64 animate-pulse rounded-brand' />
  </div>
)
