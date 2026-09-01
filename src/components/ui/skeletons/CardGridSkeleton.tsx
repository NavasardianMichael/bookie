import { FC } from 'react'
import { ResponsiveGrid, ResponsiveGridProps } from '@components/ui/layout/ResponsiveGrid'

type Props = {
  count?: number
  min?: ResponsiveGridProps['min']
}

/**
 * Renders through the same ResponsiveGrid, with the same aspect-ratio image box,
 * as the cards it stands in for — so the hand-off is pixel-stable and costs no
 * layout shift.
 */
export const CardGridSkeleton: FC<Props> = ({ count = 8, min }) => (
  <ResponsiveGrid min={min} aria-hidden='true'>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className='border-brand-border bg-surface overflow-hidden rounded-brand border shadow-sm'>
        <div className='bg-surface-sunken aspect-[4/3] animate-pulse' />
        <div className='flex flex-col gap-2 p-4'>
          <div className='bg-surface-sunken h-5 w-3/4 animate-pulse rounded' />
          <div className='bg-surface-sunken h-4 w-full animate-pulse rounded' />
          <div className='bg-surface-sunken h-4 w-2/3 animate-pulse rounded' />
        </div>
      </div>
    ))}
  </ResponsiveGrid>
)
