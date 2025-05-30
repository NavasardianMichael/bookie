import { MOCK_PROVIDERS } from '@mock/temp-mock-providers'
import { Provider } from '@interfaces/provider'
import { ProviderCard } from './ProviderCard'

export const metadata = {
  title: 'Providers',
  description: 'Providers page',
}

const Providers = async () => {
  return (
    <div className="app-responsive-flex">
      {MOCK_PROVIDERS.map((provider: Provider) => {
        return <ProviderCard key={provider.id} data={provider} />
      })}
    </div>
  )
}

export default Providers
