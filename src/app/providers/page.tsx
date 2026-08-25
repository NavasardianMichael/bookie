import { getProvidersListLDSchema } from '@linkedDataSchema/providers'
import type { Metadata } from 'next'
import { getProvidersListAPI } from '@api/providers/main'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import JsonLd from '@components/ui/bare/JsonLd'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { ProviderCard } from './ProviderCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Providers',
  description: 'Browse every provider on Bookie and reserve a time that works.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.providers] },
}

const Providers = async () => {
  const { allIds, byId } = await getProvidersListAPI()
  const providers = allIds.map((providerId) => byId[providerId!])

  return (
    <PageShell className='flex flex-col gap-6'>
      <JsonLd data={getProvidersListLDSchema(providers)} />

      <PageHeader title='Providers' subtitle={allIds.length ? `${allIds.length} available` : undefined} />

      {providers.length ? (
        <ResponsiveGrid as='ul'>
          {providers.map((provider) => (
            <li key={provider.id}>
              {/* h2: the page's only other heading is the PageHeader's h1. */}
              <ProviderCard data={provider} headingLevel={2} />
            </li>
          ))}
        </ResponsiveGrid>
      ) : (
        <EmptyState
          title='No providers yet'
          description='Providers will appear here as soon as they publish a profile.'
        />
      )}
    </PageShell>
  )
}

export default Providers
