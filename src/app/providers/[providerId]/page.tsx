import '@fullcalendar/core'
import { Metadata } from 'next'
import { getProviderAPI } from '@api/providers/main'
import { Provider as ProviderType } from '@store/providers/profile/types'
import '@styles/full-calendar-override.css'
import ProviderDetails from './components/Details'

type Props = {
  params: Promise<{
    providerId: ProviderType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  console.log({ params })

  const provider = await getProviderAPI({
    id: (await params).providerId,
  })
  const { basic, details } = provider

  const organizationTitleText = details.organization?.name ? ` | ${details.organization.name}` : ''
  const organizationDescriptionText = details.organization?.name ? `, who works at ${details.organization.name}.` : ''

  return {
    title: `Bookie | ${basic.category} | ${provider.basic.firstName} ${provider.basic.lastName}${organizationTitleText}`,
    description: `Welcome to ${provider.basic.firstName} ${provider.basic.lastName}'s profile page${organizationDescriptionText}`,
    keywords: `${provider.basic.firstName}, ${provider.basic.lastName}, ${provider.details.country}, ${provider.details.address}, ${provider.details.phone}, ${provider.details.email}`,
    classification: `${basic.category}`,
    authors: [
      {
        name: 'Michael Navasardyan',
        url: 'https://www.linkedin.com/in/michael-navasardyan/',
      },
    ],
  }
}

const Provider = async ({ params }: Props) => {
  console.log({ params: await params })
  const provider = await getProviderAPI({
    id: (await params).providerId,
  })

  return (
    <article className="max-w-2xl mx-auto flex flex-col gap-4">
      <h2 className="text-2xl mb-0">
        {provider.basic.category} | {provider.basic.firstName} {provider.basic.lastName}
      </h2>
      <ul className="list-none p-0 m-0 text-sm">
        <li>
          <strong>Phone:</strong> {provider.details.phone}
        </li>
        <li>
          <strong>Country:</strong> {provider.details.country}
        </li>
        <li>
          <strong>Address:</strong> {provider.details.address}
        </li>
        <li>
          <strong>Email:</strong> {provider.details.email}
        </li>
      </ul>
      <ProviderDetails initialState={provider} />
    </article>
  )
}

export default Provider
