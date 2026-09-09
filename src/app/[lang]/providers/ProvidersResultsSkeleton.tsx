import { FC } from 'react'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'
import { PROVIDERS_PER_PAGE } from './exploreParams'

/**
 * Stands in for `ProvidersResults` inside the page's Service providers section.
 *
 * The heading and toolbar live on the page, outside this fallback, so they do not jump
 * or remount while the grid streams in. Used by both the `<Suspense>` boundary and the
 * route's `loading.tsx`.
 */
export const ProvidersResultsSkeleton: FC = () => (
  <div className='flex flex-col gap-8'>
    <CardGridSkeleton count={PROVIDERS_PER_PAGE} aspect='16/9' />
    {/* Reserves the pager's row so the page does not grow when it renders. */}
    <div aria-hidden='true' className='h-10' />
  </div>
)
