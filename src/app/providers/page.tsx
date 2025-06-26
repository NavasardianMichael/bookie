import { ProvidersList } from './ProvidersList'

export const metadata = {
  title: 'Providers List',
  description: 'Providers List Page',
}

const Providers = async () => {
  return (
    <div>
      <ProvidersList />
    </div>
  )
}

export default Providers
