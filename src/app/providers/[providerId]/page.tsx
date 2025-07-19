import { getProviderAPI } from '@api/providers/main'
import { Provider as ProviderType } from '@store/providers/profile/types'
import { GenerateMetadata } from '@interfaces/components'
import AppLink from '@components/shared/AppLink'
import '@styles/full-calendar-override.css'
import ProviderDetails from './components/Details'

type Props = {
  params: Promise<{
    providerId: ProviderType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }) => {
  const { providerId } = await params
  const provider = await getProviderAPI({
    id: providerId,
  })
  const { basic, details } = provider
  const basicOrganization = details.organization?.basic

  const organizationTitleText = basicOrganization ? ` | ${basicOrganization.name}` : ''
  const organizationDescriptionText = basicOrganization ? `, who works at ${basicOrganization.name}.` : ''

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
      <section className='flex items-start gap-4'>
        <div className='flex flex-col gap-4 grow'>
          <h2 className='text-xl mb-0 font-bold'>
            {provider.basic.firstName} {provider.basic.lastName}
          </h2>
          <h3 className='text-lg mb-0'>{provider.basic.category}</h3>
          {provider.details.organization ? (
            <AppLink href={provider.details.organization.id}>#{provider.details.organization?.basic.name}</AppLink>
          ) : (
            <p>No organization</p>
          )}
          <div className='p-0 m-0 flex flex-col gap-2'>
            <div>
              <p>
                <strong>Phone</strong>
              </p>
              <a href={`tel:${provider.details.phone}`} target='_blank' className='underline block!'>
                {provider.details.phone}
              </a>
            </div>
            <div>
              <p>
                <strong>Address</strong>
              </p>
              <p>{provider.details.address}</p>
            </div>
            <div>
              <p>
                <strong>Email</strong>{' '}
              </p>
              <a href={`mailto:${provider.details.email}`} target='_blank' className='underline block!'>
                {provider.details.email}
              </a>
            </div>
          </div>
        </div>
        <img
          src={provider.basic.image}
          alt={`${provider.basic.firstName} ${provider.basic.lastName}`}
          className='w-full max-w-[160px] object-cover'
        />
      </section>
      <section>
        <ProviderDetails initialState={provider} />
      </section>
    </article>
  )
}

export default Provider
