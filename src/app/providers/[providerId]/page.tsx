import { Provider as ProviderType } from '@interfaces/provider'
import { Metadata, ResolvingMetadata } from 'next'

type Props = {
    params: Promise<{
        providerId: ProviderType['id']
    }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const generateMetadata = async ({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> => {
    const { providerId } = await params
    console.log(await parent)

    return {
        title: `Provider page with an id ${providerId}`,
        description: `ProviderId => ${providerId}`
    }
}

const Provider = async ({ params }: Props) => {
    const { providerId } = await params
    return (
        <article>
            <header>Id fo the Provider is: {providerId}</header>
        </article>
    )
}

export default Provider
