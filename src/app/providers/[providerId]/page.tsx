import { getProviderLDSchema } from '@linkedDataSchema/providers'
import { Descriptions, DescriptionsProps, Tag } from 'antd'
import { Metadata } from 'next'
import Image from 'next/image'
import serializeJavascript from 'serialize-javascript'
import { getSingleProviderAPI } from '@api/providers/main'
import { ProviderProfile as ProviderProfileType } from '@store/providers/profile/types'
import { GenerateMetadata } from '@interfaces/components'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { resolveAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import AppAvatar from '@components/ui/AppAvatar'
import AppLink from '@components/ui/AppLink'
import ContactActions from '@components/ui/ContactActions'
import { PageHeader, PageShell, Section } from '@components/ui/layout'
import ProviderDetails from './components/Details'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    providerId: ProviderProfileType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }): Promise<Metadata> => {
  const { providerId } = await params
  const provider = await getSingleProviderAPI({
    id: providerId,
  })
  const { basic } = provider
  const basicOrganization = basic.organization?.basic

  const organizationTitleText = basicOrganization ? ` | ${basicOrganization.name}` : ''
  const organizationDescriptionText = basicOrganization ? `, who works at ${basicOrganization.name}.` : ''

  return {
    title: `Bookie | ${provider.basic.firstName} ${provider.basic.lastName}${organizationTitleText} | ${basic.categories?.map((cat) => cat.name).join(', ')}`,
    description: `Welcome to ${provider.basic.firstName} ${provider.basic.lastName}'s profile page${organizationDescriptionText}`,
    keywords: `Bookie, ${provider.basic.firstName}, ${provider.basic.lastName}, ${provider.details.country}, ${provider.details.location.address}, ${generateFriendlyPhoneNumber(provider.details.phone, { prefix: '+' })}, ${provider.details.email}`,
    classification: basic.categories?.map((cat) => cat.name).join(', ') ?? '',
  }
}

const Provider = async ({ params }: Props) => {
  const { providerId } = await params

  const provider = await getSingleProviderAPI({
    id: providerId,
  })

  const jsonLd = getProviderLDSchema(provider)

  const { basic, details } = provider
  const organization = basic.organization
  const categories = basic.categories
  const fullName = `${basic.firstName} ${basic.lastName}`
  const image = resolveAssetUrl(basic.image)
  const phone = generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' })

  const detailItems: DescriptionsProps['items'] = [
    {
      key: 'phone',
      label: 'Phone',
      children: (
        <a href={`tel:${phone}`} className='tnum'>
          {phone}
        </a>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      children: (
        <a href={generateGoogleMapsLink(details.location.address)} target='_blank' rel='noopener noreferrer'>
          {details.location.address}
        </a>
      ),
    },
  ]

  if (details.email) {
    detailItems.push({
      key: 'email',
      label: 'Email',
      children: <a href={`mailto:${details.email}`}>{details.email}</a>,
    })
  }

  if (details.country) {
    detailItems.push({ key: 'country', label: 'Country', children: details.country })
  }

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: serializeJavascript(jsonLd),
        }}
      />

      <PageHeader
        title={fullName}
        subtitle={basic.description}
        media={
          image ? (
            // Fixed aspect box: the raw <img max-w-[160px]> in a never-wrapping
            // row squeezed the text column to ~120px on a phone.
            <div className='bg-surface-sunken relative aspect-[4/3] w-full overflow-hidden rounded-brand md:aspect-square md:w-40'>
              <Image
                src={image}
                alt={fullName}
                fill
                priority
                sizes='(max-width: 768px) 100vw, 160px'
                className='object-cover'
              />
            </div>
          ) : (
            <AppAvatar name={fullName} size={96} shape='square' />
          )
        }
        meta={
          <>
            {categories?.map((category) => (
              <AppLink
                key={category.id}
                href={`${ROUTES[ROUTE_KEYS.categories]}/${category.id}`}
                className='no-underline'
              >
                <Tag>{category.name}</Tag>
              </AppLink>
            ))}
            {organization && (
              <AppLink href={`${ROUTES.organizations}/${organization.id}`} className='no-underline'>
                <Tag color='blue'>{organization.basic.name}</Tag>
              </AppLink>
            )}
          </>
        }
        actions={
          <ContactActions phone={phone} address={details.location.address} email={details.email} />
        }
      />

      <Section title='Book an appointment' headingLevel={2}>
        <ProviderDetails initialState={provider} />
      </Section>

      <Section title='Details' headingLevel={2}>
        <Descriptions column={{ xs: 1, md: 2 }} size='small' bordered items={detailItems} />
      </Section>
    </PageShell>
  )
}

export default Provider
