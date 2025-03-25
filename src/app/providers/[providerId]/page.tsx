import { Provider as ProviderType } from '@interfaces/provider'

type Params = Promise<{
    providerId: ProviderType['id']
}>

const Provider = async ({ params }: { params: Params }) => {
    const { providerId } = await params
    return (
        <article>
            <header>Provider Id: {providerId}</header>
        </article>
    )
}

export default Provider
