import { Provider as ProviderType } from '@interfaces/provider'
import { MOCK_PROVIDERS } from '@mock/providers'

import type { GetStaticProps, InferGetStaticPropsType } from 'next'

export const getStaticProps = (async (context) => {
    return { props: MOCK_PROVIDERS.find(provider => context.params?.providerId === provider.id)! }
}) satisfies GetStaticProps<ProviderType>


const Provider = async (params: InferGetStaticPropsType<typeof getStaticProps>) => {
    return <article>
        <h2>{params.name}</h2>
    </article>
}

export default Provider
