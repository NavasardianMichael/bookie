import { getProvidersListLDSchema } from '@linkedDataSchema/providers'
import serializeJavascript from 'serialize-javascript'
import { getProvidersListAPI } from '@api/providers/main'
import { ProviderCard } from './ProviderCard'

export const metadata = {
  title: 'Providers List',
  description: 'Providers List Page',
}

const Providers = async () => {
  try {
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
  } catch (error) {
    return <h1>{JSON.stringify(error)}</h1> // Your custom error component
  }
}
export default Providers
