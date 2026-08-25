import { getOrganizationsListLDSchema } from '@linkedDataSchema/organizations'
import type { Metadata } from 'next'
import { getOrganizationsListAPI } from '@api/organizations/main'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import JsonLd from '@components/ui/bare/JsonLd'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { OrganizationCard } from './components/OrganizationCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Organizations',
  description: 'Browse the clinics, salons and studios taking bookings on Bookie.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.organizations] },
}

const Organizations = async () => {
  const { allIds, byId } = await getOrganizationsListAPI()
  const organizations = allIds.map((organizationId) => byId[organizationId!])

  return (
    <PageShell className='flex flex-col gap-6'>
      <JsonLd data={getOrganizationsListLDSchema(organizations)} />

      <PageHeader title='Organizations' subtitle={allIds.length ? `${allIds.length} listed` : undefined} />

      {organizations.length ? (
        <ResponsiveGrid as='ul'>
          {organizations.map((organization) => (
            <li key={organization.id}>
              <OrganizationCard data={organization} headingLevel={2} />
            </li>
          ))}
        </ResponsiveGrid>
      ) : (
        <EmptyState title='No organizations yet' description='Organizations will appear here once they are added.' />
      )}
    </PageShell>
  )
}

export default Organizations
