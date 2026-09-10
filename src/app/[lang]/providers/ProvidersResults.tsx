import { getProvidersListLDSchema } from '@linkedDataSchema/providers'
import { getTranslations } from 'next-intl/server'
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
  const [{ list, pagination }, t, tCommon] = await Promise.all([
    getProvidersListAPI(toProvidersListQuery(params)),
    getTranslations('Explore'),
    getTranslations('Common'),
  ])
  const providers = list.allIds.map((providerId) => list.byId[providerId!])

  if (!providers.length) {
    return hasActiveExploreParams(params) ? (
      <EmptyState
        title={t('emptyFilteredTitle')}
        description={t('emptyFilteredBody')}
        action={
          <AppLink href={ROUTES.providers} variant='button' tone='primary'>
            {t('clearFilters')}
          </AppLink>
        }
      />
    ) : (
      <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
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
        label={t('pagesLabel')}
        previousLabel={tCommon('previousPage')}
        nextLabel={tCommon('nextPage')}
        pageLabel={(page) => tCommon('pageNumber', { page })}
        className='pt-4'
      />
    </div>
  )
}
