import { Provider as ProviderType } from '@interfaces/provider'
import { Metadata, ResolvingMetadata } from 'next'
import ProviderCalendar from './components/Calendar'
import Title from 'antd/es/typography/Title'

type Props = {
    params: Promise<{
        providerId: ProviderType['id']
    }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
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
            <Title level={2} style={{ fontSize: '1rem', marginBottom: 0 }}>Id fo the Provider is: {providerId}</Title>
            <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Enim quaerat ipsam perferendis voluptas, sunt quo atque suscipit minus saepe consequuntur porro, labore exercitationem! Perferendis temporibus natus obcaecati vitae voluptate! Itaque.</p>
            <ProviderCalendar />
        </article>
    )
}

export default Provider
