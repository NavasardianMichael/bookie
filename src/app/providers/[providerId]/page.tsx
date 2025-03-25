import { Provider as ProviderType } from '@interfaces/provider'
import { PageProps } from '../../../../.next/types/app/page'

// export const getStaticProps = (async (context) => {
//     return { props: MOCK_PROVIDERS.find(provider => context.params?.providerId === provider.id)! }
// }) satisfies GetStaticProps<ProviderType>

type Context = {
    params: Promise<{
        providerId: ProviderType['id']
    }>
}

const Provider = async ({ params }: PageProps) => {
    const { providerId } = await params
    return (
        <article>
            <header>Provider Id: {providerId}</header>
        </article>
    )
}

export default Provider
