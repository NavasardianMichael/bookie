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
  const { providerId } = await params
  const provider = await getProviderAPI({
    id: providerId,
  })
  const { basic, details } = provider

  const organizationTitleText = details.organization?.name ? ` | ${details.organization.name}` : ''
  const organizationDescriptionText = details.organization?.name ? `, who works at ${details.organization.name}.` : ''

  return {
    title: `Bookie | ${basic.category} | ${provider.basic.firstName} ${provider.basic.lastName}${organizationTitleText}`,
    description: `Welcome to ${provider.basic.firstName} ${provider.basic.lastName}'s profile page${organizationDescriptionText}`,
    keywords: `Bookie, ${provider.basic.firstName}, ${provider.basic.lastName}, ${provider.details.country}, ${provider.details.address}, ${provider.details.phone}, ${provider.details.email}`,
    classification: basic.category,

  }
}

const Provider = async ({ params }: Props) => {
  const { providerId } = await params

  const provider = await getProviderAPI({
    id: providerId,
  })

  return (
    <article className='flex flex-col gap-4 w-full'>
      <section className='flex gap-4'>
        <div className='flex flex-col gap-4 grow text-xs!'>
          <h2 className='text-xl mb-0 font-bold'>
            {provider.basic.firstName} {provider.basic.lastName}
          </h2>
          <h3 className='text-lg mb-0'>
            {provider.basic.category}
          </h3>
          <h4>
            {provider.details.organization?.name || 'No organization'}
          </h4>
          <ul className='text-sm list-none p-0 m-0'>
            <li>
              <strong>Phone:</strong> <a href={`tel:${provider.details.phone}`} target='_blank'>{provider.details.phone}</a>
            </li>
            <li>
              <strong>Country:</strong> {provider.details.country}
            </li>
            <li>
              <strong>Address:</strong> {provider.details.address}
            </li>
            <li>
              <strong>Email:</strong> <a href={`mailto:${provider.details.email}`} target='_blank'>{provider.details.email}</a>
            </li>
          </ul>
        </div>
        <img src={provider.basic.image} alt={`${provider.basic.firstName} ${provider.basic.lastName}`} className='w-full object-cover' />
      </section>
      <section>
        <ProviderDetails initialState={provider} />
      </section>
    </article>
  )
}

export default Provider
