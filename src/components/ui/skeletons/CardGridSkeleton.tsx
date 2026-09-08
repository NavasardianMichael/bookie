import { FC } from 'react'
import { cn } from '@helpers/cn'
import { ResponsiveGrid, ResponsiveGridProps } from '@components/ui/layout/ResponsiveGrid'

type Props = {
  count?: number
  min?: ResponsiveGridProps['min']
  /**
   * Mirror the real card's media well. `false` is for category cards, which have
   * no photo slot — a pulsing aspect box there would jump when content arrives.
   */
  aspect?: '4/3' | '16/9' | false
}

const ASPECTS = {
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
} as const

/**
 * Renders through the same ResponsiveGrid, with the same aspect-ratio image box,
 * as the cards it stands in for — so the hand-off is pixel-stable and costs no
 * layout shift.
 */
export const CardGridSkeleton: FC<Props> = ({ count = 8, min, aspect = '4/3' }) => (
  <ResponsiveGrid min={min} aria-hidden='true'>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className='border-brand-border bg-surface overflow-hidden rounded-brand border shadow-sm'>
        {aspect !== false && <div className={cn('bg-surface-sunken animate-pulse', ASPECTS[aspect])} />}
        <div className='flex flex-col gap-2 p-4'>
          <div className='bg-surface-sunken h-5 w-3/4 animate-pulse rounded' />
          <div className='bg-surface-sunken h-4 w-full animate-pulse rounded' />
          <div className='bg-surface-sunken h-4 w-2/3 animate-pulse rounded' />
        </div>
      </div>
    ))}
  </ResponsiveGrid>
)
