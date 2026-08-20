import { Descriptions, Tag } from 'antd'
import { Metadata } from 'next'
import { getOrganizationAPI } from '@api/organizations/main'
import { Organization as OrganizationType } from '@store/organizations/single/types'
import { GenerateMetadata } from '@interfaces/components'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { generateGoogleMapsLink } from '@helpers/location'
import AppAvatar from '@components/ui/AppAvatar'
import AppLink from '@components/ui/AppLink'
import ContactActions from '@components/ui/ContactActions'
import { PageHeader, PageShell } from '@components/ui/layout'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    organizationId: OrganizationType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }): Promise<Metadata> => {
  const { organizationId } = await params
  const organization = await getOrganizationAPI({
    id: organizationId,
  })

  const basicOrganization = organization.basic

  return {
    title: `Bookie | ${basicOrganization.categories.map((category) => category.name).join('| ')} | ${basicOrganization.name}`,
    description: `Welcome to ${basicOrganization.name}`,
    keywords: `Bookie, ${basicOrganization.name}, ${organization.details.country}, ${organization.details.location.address}, ${organization.details.phone}, ${organization.details.email}`,
    classification: basicOrganization.categories.map((category) => category.name).join(', '),
  }
}

const Organization = async ({ params }: Props) => {
  const { organizationId } = await params

  const organization = await getOrganizationAPI({
    id: organizationId,
  })

  const { basic, details } = organization

  return (
    <PageShell as='article' width='prose' className='flex flex-col gap-6'>
      <PageHeader
        title={basic.name}
        subtitle={basic.description}
        media={<AppAvatar src={details.logoUrl} name={basic.name} size={72} shape='square' />}
        meta={basic.categories.map((category) => (
          <AppLink
            key={category.id}
            href={`${ROUTES[ROUTE_KEYS.categories]}/${category.id}`}
            className='no-underline'
          >
            <Tag>{category.name}</Tag>
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

      {/* Descriptions collapses to a single column below md on its own, which
          replaces four hand-built label/value blocks. */}
      <Descriptions column={{ xs: 1, md: 2 }} size='small' bordered items={[
        { key: 'phone', label: 'Phone', children: <a href={`tel:${details.phone}`}>{details.phone}</a> },
        {
          key: 'address',
          label: 'Address',
          children: (
            <a href={generateGoogleMapsLink(details.location.address)} target='_blank' rel='noopener noreferrer'>
              {details.location.address}
            </a>
          ),
        },
        { key: 'email', label: 'Email', children: <a href={`mailto:${details.email}`}>{details.email}</a> },
        {
          key: 'website',
          label: 'Website',
          children: (
            <a href={details.website} target='_blank' rel='noopener noreferrer'>
              {details.website}
            </a>
          ),
        },
        { key: 'country', label: 'Country', children: details.country },
      ]} />
    </PageShell>
  )
}

export default Organization
