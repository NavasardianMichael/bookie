import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getCategoriesListAPI } from '@api/categories/main'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ChipRail, PageShell, Section } from '@components/ui/layout'
import { buildExploreHref, exploreParamsKey, parseExploreParams, RawSearchParams } from './exploreParams'
import { ProviderExploreToolbar } from './ProviderExploreToolbar'
import { ProviderSearchField } from './ProviderSearchField'
import { ProvidersResults } from './ProvidersResults'
import { ProvidersResultsSkeleton } from './ProvidersResultsSkeleton'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Explore providers',
    description: 'Browse every provider on Bookie and reserve a time that works.',
    // Self-canonical to the bare path, which is also what de-duplicates the filtered
    // and paged views: `?q=hair&page=3` canonicals to `/en/providers`, so a subset of
    // the same rows never becomes its own index entry. See `src/i18n/CLAUDE.md`.
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.providers]),
  }
}

type Props = {
  searchParams: Promise<RawSearchParams>
}

/**
 * Explore.
 *
 * A Server Component that reads its whole state out of the query string — see
 * `exploreParams.ts` for why the URL rather than a store. Only two things are client
 * islands: the search box and the sort/filter pair. The category chips and
 * the pager are plain anchors, so both work before hydration and both are crawlable.
 *
 * Clicking a category **filters here** rather than navigating to `/categories/[id]` — the
 * chip patches `?category=`, which keeps the visitor's search and sort intact. The
 * category *pages* still exist and are still linked from View all; they are the
 * single-category landing pages, not this rail's destination.
 */
export default async function Providers({ searchParams }: Props) {
  const params = parseExploreParams(await searchParams)
  const categories = await getCategoriesListAPI()

  return (
    <PageShell className='flex flex-col gap-10'>
      <header className='mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center'>
        <AppTitle level='h1'>
          Find and book <span className='text-brand italic'>top-rated</span> professionals.
        </AppTitle>
        <div className='w-full'>
          <ProviderSearchField
            params={params}
            label='Search providers'
            placeholder='What service are you looking for?'
          />
        </div>
      </header>

      {!!categories.allIds.length && (
        <Section
          title='Browse categories'
          actions={
            <AppLink href={ROUTES.categories} variant='plain' className='text-body-sm font-bold text-brand'>
              View all
            </AppLink>
          }
        >
          <ChipRail label='Categories'>
            <li className='shrink-0'>
              <AppLink
                href={buildExploreHref(params, { categoryId: '' })}
                variant='chip'
                aria-current={params.categoryId ? undefined : 'true'}
                className={params.categoryId ? undefined : 'bg-brand border-brand text-white hover:text-white'}
              >
                All services
              </AppLink>
            </li>
            {categories.allIds.map((categoryId) => {
              const category = categories.byId[categoryId!]
              const isActive = params.categoryId === category.id

              return (
                <li key={category.id} className='shrink-0'>
                  <AppLink
                    // Re-clicking the active chip clears it, so the rail is a toggle and
                    // there is no dead control.
                    href={buildExploreHref(params, { categoryId: isActive ? '' : category.id })}
                    variant='chip'
                    aria-current={isActive ? 'true' : undefined}
                    className={isActive ? 'bg-brand border-brand text-white hover:text-white' : undefined}
                  >
                    {category.name}
                  </AppLink>
                </li>
              )
            })}
          </ChipRail>
        </Section>
      )}

      {/* Heading + toolbar stay outside Suspense so a new query does not remount the
          sort/filter sheet or jump the title. Only the grid swaps for a skeleton. */}
      <Section
        title='Service providers'
        className='gap-8'
        actions={<ProviderExploreToolbar params={params} />}
      >
        <Suspense key={exploreParamsKey(params)} fallback={<ProvidersResultsSkeleton />}>
          <ProvidersResults params={params} />
        </Suspense>
      </Section>
    </PageShell>
  )
}
