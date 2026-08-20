import { getOrganizationsListAPI } from '@api/organizations/main'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { OrganizationCard } from './components/OrganizationCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Organizations List',
  description: 'Organizations List Page',
}

const Organizations = async () => {
  const { allIds, byId } = await getOrganizationsListAPI()

  return (
    <PageShell className='flex flex-col gap-6'>
      <PageHeader title='Organizations' subtitle={allIds.length ? `${allIds.length} listed` : undefined} />

      {allIds.length ? (
        <ResponsiveGrid as='ul'>
          {allIds.map((organizationId) => (
            <li key={organizationId}>
              <OrganizationCard data={byId[organizationId!]} />
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
