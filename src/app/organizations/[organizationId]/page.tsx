import { getOrganizationLDSchema } from '@linkedDataSchema/organizations'
import { Metadata } from 'next'
import { getOrganizationAPI } from '@api/organizations/main'
import { Organization as OrganizationType } from '@store/organizations/single/types'
import { GenerateMetadata } from '@interfaces/components'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { isUploadedAsset, resolveAbsoluteAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import AppAvatar from '@components/ui/AppAvatar'
import AppDescriptionList, { AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import AppLink from '@components/ui/bare/AppLink'
import JsonLd from '@components/ui/bare/JsonLd'
import ContactActions from '@components/ui/ContactActions'
import { PageHeader, PageShell, Surface } from '@components/ui/layout'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    organizationId: OrganizationType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }): Promise<Metadata> => {
  const { organizationId } = await params
  const organization = await getOrganizationAPI({ id: organizationId })

  const { basic, details } = organization
  const categoryNames = basic.categories.map((category) => category.name)
  const path = `${ROUTES[ROUTE_KEYS.organizations]}/${organizationId}`
  // Only a real upload may override app/opengraph-image.tsx — see the provider page.
  const ogImage = isUploadedAsset(details.logoUrl) ? resolveAbsoluteAssetUrl(details.logoUrl) : undefined

  const title = [basic.name, categoryNames.join(', ')].filter(Boolean).join(' | ')
  const description = basic.description || `Book an appointment at ${basic.name}.`

  return {
    title,
    description,
    keywords: ['Bookie', basic.name, ...categoryNames, details.country, details.location.address]
      .filter(Boolean)
      .join(', '),
    classification: categoryNames.join(', '),
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: path,
      images: ogImage ? [{ url: ogImage, alt: basic.name }] : undefined,
    },
  }
}

const Organization = async ({ params }: Props) => {
  const { organizationId } = await params

  const organization = await getOrganizationAPI({ id: organizationId })

  const { basic, details } = organization

  const detailItems: AppDescriptionListItem[] = [
    { key: 'phone', label: 'Phone', value: <AppLink href={`tel:${details.phone}`}>{details.phone}</AppLink> },
    {
      key: 'address',
      label: 'Address',
      value: (
        <AppLink href={generateGoogleMapsLink(details.location.address)} target='_blank'>
          {details.location.address}
        </AppLink>
      ),
    },
    { key: 'email', label: 'Email', value: <AppLink href={`mailto:${details.email}`}>{details.email}</AppLink> },
    {
      key: 'website',
      label: 'Website',
      value: (
        <AppLink href={details.website} target='_blank'>
          {details.website}
        </AppLink>
      ),
    },
    { key: 'country', label: 'Country', value: details.country },
  ]

  return (
    <PageShell as='article' className='flex flex-col gap-6'>
      <JsonLd data={getOrganizationLDSchema(organization)} />

      <Surface>
        <PageHeader
          title={basic.name}
          subtitle={basic.description}
          media={<AppAvatar src={details.logoUrl} name={basic.name} size={72} shape='square' />}
          meta={basic.categories.map((category) => (
            <AppLink
              key={category.id}
              href={`${ROUTES[ROUTE_KEYS.categories]}/${category.id}`}
              variant='chip'
              className='h-8 min-h-8 px-3 text-caption'
            >
              {category.name}
            </AppLink>
          ))}
          actions={
            <ContactActions
              phone={details.phone}
              address={details.location.address}
              email={details.email}
              website={details.website}
            />
          }
        />
      </Surface>

      {/* A <dl> rather than antd's Descriptions: same single-column collapse below
          md, but server-rendered, so the phone and address are in the HTML. */}
      <AppDescriptionList items={detailItems} />
    </PageShell>
  )
}

export default Organization
