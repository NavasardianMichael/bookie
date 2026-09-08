import { FC } from 'react'
import { Section } from '@components/ui/layout'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'
import { PROVIDERS_PER_PAGE } from './exploreParams'

/**
 * Stands in for `ProvidersResults`, and must keep its own heading.
 *
 * A bare `CardGridSkeleton` would drop the "Top service providers" heading for the length
 * of the request and then push the grid back down when it returned — a visible jump on
 * every search. The count is the one thing left out: it appends inline after the title,
 * so it costs no vertical space when it arrives.
 *
 * Used by both the `<Suspense>` boundary on the page and the route's `loading.tsx`, so a
 * first paint and a re-query look the same.
 */
export const ProvidersResultsSkeleton: FC = () => (
  <Section title='Top service providers' className='gap-8'>
    <CardGridSkeleton count={PROVIDERS_PER_PAGE} aspect='16/9' />
    {/* Reserves the pager's row so the page does not grow when it renders. */}
    <div aria-hidden='true' className='h-10' />
  </Section>
)
