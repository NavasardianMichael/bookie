import { MOCK_PROVIDERS } from '@mock/providers'
import { ProviderCard } from './ProviderCard'

const Providers = () => {
    return (
        <div className='flex flex-wrap gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6'>{
            MOCK_PROVIDERS.map((provider) => {
                return (
                    <ProviderCard key={provider.id} data={provider} />
                )
            })}</div>
    )
}

export default Providers