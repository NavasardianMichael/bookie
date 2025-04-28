import axiosInstance from '@api/axiosInstance'
import { Provider } from '@interfaces/provider'
import { ProviderCard } from './ProviderCard'

const getMiniEntitiesAPI = async () => {
  const { data } = await axiosInstance.get('/providers')
  return data
}

export const metadata = {
  title: 'Providers',
  description: 'Providers page',
}

const Providers = async () => {
  const providers = await getMiniEntitiesAPI()

  return (
    <div className="app-responsive-flex">
      {providers.map((provider: Provider) => {
        return <ProviderCard key={provider.id} data={provider} />
      })}
    </div>
  )
}

export default Providers
