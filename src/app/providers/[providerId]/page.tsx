
import { Provider as ProviderType } from '@interfaces/provider'

// export const getStaticProps = (async (context) => {
//     return { props: MOCK_PROVIDERS.find(provider => context.params?.providerId === provider.id)! }
// }) satisfies GetStaticProps<ProviderType>


type Context = {
    params: {
        providerId: ProviderType['id']
    }
}

const Provider = async (context: Context) => {
    const params = await context.params
    return <article>
        <header>Provider Id: {params.providerId}</header>
    </article>
}

export default Provider
