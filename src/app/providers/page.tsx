import { MOCK_PROVIDERS } from '@mock/providers'
import { ProviderCard } from './ProviderCard'

const Providers = () => {
  return (
    <div className="app-responsive-flex">
      {MOCK_PROVIDERS.map((provider) => {
        return <ProviderCard key={provider.id} data={provider} />
      })}
    </div>
  )
}

export default Providers
