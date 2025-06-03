import db from '@mock/db.json'
import { Provider } from '@store/providers/profile/types'
import { ProviderCard } from './ProviderCard'

export const metadata = {
  title: 'Providers',
  description: 'Providers page',
}

type Props = {
  providers: Provider[]
}

async function getProviders(): Promise<Props> {
  try {
    const res = await fetch(`${process.env.API_URL}/providers`)
    const providers = await res.json()

    return { providers }
  } catch {
    // Fallback to mock data in case of an error
    return { providers: db.providers as Props['providers'] }
  }
}

const Providers = async () => {
  const response = await getProviders()

  return (
    <div className="app-responsive-flex">
      {response.providers.map((provider: Provider) => {
        return <ProviderCard key={provider.id} data={provider} />
      })}
    </div>
  )
}

export default Providers
