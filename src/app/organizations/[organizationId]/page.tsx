import { getOrganizationAPI } from '@api/organizations/main'
import { Organization as OrganizationType } from '@store/organizations/single/types'
import { GenerateMetadata } from '@interfaces/components'
import { generateGoogleMapsLink } from '@helpers/location'
import AppLink from '@components/shared/AppLink'

type Props = {
  params: Promise<{
    organizationId: OrganizationType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }) => {
  const { organizationId } = await params
  const organization = await getOrganizationAPI({
    id: organizationId,
  })

  const basicOrganization = organization.basic

  return {
    title: `Bookie | ${basicOrganization.categories.map((category) => category.name).join('| ')} | ${basicOrganization.name}`,
    description: `Welcome to ${basicOrganization.name}`,
    keywords: `Bookie, ${basicOrganization.name}, ${organization.details.country}, ${organization.details.address}, ${organization.details.phone}, ${organization.details.email}`,
    classification: basicOrganization.categories.map((category) => category.name).join(', '),
  }
}

const Organization = async ({ params }: Props) => {
  const { organizationId } = await params

  const organization = await getOrganizationAPI({
    id: organizationId,
  })

  return (
    <article>
      <div className='flex flex-col gap-4 grow'>
        <h2 className='text-xl mb-0 font-bold'>{organization.basic.name}</h2>
        <h3 className='text-lg mb-0'>
          {organization.basic.categories.map((category) => {
            return (
              <AppLink key={category.id} href={category.id}>
                {category.name}
              </AppLink>
            )
          })}
        </h3>

        <div className='p-0 m-0 flex flex-col gap-2'>
          <div>
            <p>
              <strong>Phone</strong>
            </p>
            <a href={`tel:${organization.details.phone}`} target='_blank' className='underline block!'>
              {organization.details.phone}
            </a>
          </div>
          <div>
            <p>
              <strong>Address</strong>
            </p>
            <a href={generateGoogleMapsLink(organization.details.address)} target='_blank' className='underline block!'>
              {organization.details.address}
            </a>
          </div>
          <div>
            <p>
              <strong>Email</strong>{' '}
            </p>
            <a href={`mailto:${organization.details.email}`} target='_blank' className='underline block!'>
              {organization.details.email}
            </a>
          </div>
          <div>
            <p>
              <strong>Website</strong>
            </p>
            <a href={organization.details.website} target='_blank' className='underline block!'>
              {organization.details.website}
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}

export default Organization
