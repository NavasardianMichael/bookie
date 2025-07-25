import { getProviderLDSchema } from '@linkedDataSchema/providers'
import serializeJavascript from 'serialize-javascript'
import { getProviderAPI } from '@api/providers/main'
import { Provider as ProviderType } from '@store/providers/profile/types'
import { GenerateMetadata } from '@interfaces/components'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
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
  const { basic } = provider
  const basicOrganization = basic.organization?.basic

  const organizationTitleText = basicOrganization ? ` | ${basicOrganization.name}` : ''
  const organizationDescriptionText = basicOrganization ? `, who works at ${basicOrganization.name}.` : ''

  return {
    title: `Bookie | ${provider.basic.firstName} ${provider.basic.lastName}${organizationTitleText} | ${basic.categories.map((cat) => cat.name).join(', ')}`,
    description: `Welcome to ${provider.basic.firstName} ${provider.basic.lastName}'s profile page${organizationDescriptionText}`,
    keywords: `Bookie, ${provider.basic.firstName}, ${provider.basic.lastName}, ${provider.details.country}, ${provider.details.address}, ${provider.details.phone}, ${provider.details.email}`,
    classification: basic.categories.map((cat) => cat.name).join(', '),
  }
}

const Provider = async ({ params }: Props) => {
  const { providerId } = await params

  const provider = await getProviderAPI({
    id: providerId,
  })

  const jsonLd = getProviderLDSchema(provider)

  const organization = provider.basic.organization
  const categories = provider.basic.categories

  return (
    <article className='flex flex-col gap-4'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: serializeJavascript(jsonLd),
        }}
      />
      <section className='flex items-start gap-4'>
        <div className='flex flex-col gap-4 grow w-fit'>
          <h1 className='text-xl! mb-0 font-bold'>
            {provider.basic.firstName} {provider.basic.lastName}
          </h1>
          {categories.map((category) => {
            return (
              <AppLink key={category.id} href={`${ROUTES[ROUTE_KEYS.categories]}/${category.id}`}>
                #{category.name}
              </AppLink>
            )
          })}
          {organization ? (
            <AppLink href={`${ROUTES.organizations}/${organization.id}`}>#{organization?.basic.name}</AppLink>
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
