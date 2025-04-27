import '@fullcalendar/core'
import { Metadata } from 'next'
import { Provider as ProviderType } from '@interfaces/provider'
import '@styles/full-calendar-override.css'
import ProviderCalendar from './components/Calendar'

type Props = {
  params: Promise<{
    providerId: ProviderType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { providerId } = await params

  return {
    title: `Provider page with an id ${providerId}`,
    description: `ProviderId => ${providerId}`,
  }
}

const Provider = async ({ params }: Props) => {
  const { providerId } = await params
  return (
    <article className="max-w-2xl mx-auto flex flex-col gap-4">
      <h2 className="text-2xl mb-0">Provider {providerId}</h2>
      <p className="text-sm mb-0">
        Lorem ipsum dolor sit, amet consectetur adipisicing elit. Enim quaerat ipsam perferendis voluptas, sunt quo
        atque suscipit minus saepe consequuntur porro, labore exercitationem! Perferendis temporibus natus obcaecati
        vitae voluptate! Itaque.
      </p>
      <ProviderCalendar />
    </article>
  )
}

export default Provider
