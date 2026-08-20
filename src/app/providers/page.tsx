import { getProvidersListLDSchema } from '@linkedDataSchema/providers'
import type { Metadata } from 'next'
import serializeJavascript from 'serialize-javascript'
import { getProvidersListAPI } from '@api/providers/main'
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
    <>
      <div className='app-responsive-flex'>
        {allIds.map((providerId) => (
          <ProviderCard key={providerId} data={byId[providerId!]} />
        ))}
      </div>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: serializeJavascript(providersListLDSchema),
        }}
      />
    </>
  )
}

export default Providers
