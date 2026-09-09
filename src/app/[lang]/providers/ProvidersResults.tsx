import { getProvidersListLDSchema } from '@linkedDataSchema/providers'
import { getProvidersListAPI } from '@api/providers/main'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { EmptyState } from '@components/ui/EmptyState'
import { Pagination, ResponsiveGrid } from '@components/ui/layout'
import { buildExploreHref, ExploreParams, hasActiveExploreParams, toProvidersListQuery } from './exploreParams'
import { ProviderCard } from './ProviderCard'

type Props = {
  params: ExploreParams
}

/**
 * The result set, split out from the page so it can suspend on its own.
 *
 * The page shell — search box, category rail, results heading and toolbar — is already
 * correct for the new query before the API answers, so re-rendering them would only make
 * the controls flicker. Suspending just this subtree lets the shell stay put and the grid
 * hand over to a skeleton, which is what makes a search feel like filtering rather than a
 * page load.
 */
export const ProvidersResults = async ({ params }: Props) => {
  const { list, pagination } = await getProvidersListAPI(toProvidersListQuery(params))
  const providers = list.allIds.map((providerId) => list.byId[providerId!])

  if (!providers.length) {
    return hasActiveExploreParams(params) ? (
      <EmptyState
        title='No providers match those filters'
        description='Try a different search term, or clear a filter to widen the results.'
        action={
          <AppLink href={ROUTES.providers} variant='button' tone='primary'>
            Clear all filters
          </AppLink>
        }
      />
    ) : (
      <EmptyState
        title='No providers yet'
        description='Providers will appear here as soon as they publish a profile.'
      />
    )
  }

  return (
    <div className='flex flex-col gap-8'>
      {/* Describes the page in view, so the graph and the markup never disagree. */}
      <JsonLd data={getProvidersListLDSchema(providers)} />

      <ResponsiveGrid as='ul'>
        {providers.map((provider) => (
          <li key={provider.id}>
            <ProviderCard data={provider} headingLevel={3} />
          </li>
        ))}
      </ResponsiveGrid>

      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        buildHref={(page) => buildExploreHref(params, { page })}
        label='Provider pages'
        className='pt-4'
      />
    </div>
  )
}
