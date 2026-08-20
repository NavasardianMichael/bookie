import { getProvidersListLDSchema } from '@linkedDataSchema/providers'
import type { Metadata } from 'next'
import serializeJavascript from 'serialize-javascript'
import { getProvidersListAPI } from '@api/providers/main'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { ProviderCard } from './ProviderCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Providers List',
  description: 'Providers List Page',
}

const Providers = async () => {
  const { allIds, byId } = await getProvidersListAPI()
  const providersListLDSchema = getProvidersListLDSchema(allIds.map((providerId) => byId[providerId!]))

  return (
    <PageShell className='flex flex-col gap-6'>
      <PageHeader
        title='Providers'
        subtitle={allIds.length ? `${allIds.length} available` : undefined}
      />

      {allIds.length ? (
        <ResponsiveGrid as='ul'>
          {allIds.map((providerId) => (
            <li key={providerId}>
              <ProviderCard data={byId[providerId!]} />
            </li>
          ))}
        </ResponsiveGrid>
      ) : (
        <EmptyState
          title='No providers yet'
          description='Providers will appear here as soon as they publish a profile.'
        />
      )}

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: serializeJavascript(providersListLDSchema),
        }}
      />
    </PageShell>
  )
}

export default Providers
