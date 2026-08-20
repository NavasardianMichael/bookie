import { getOrganizationsListAPI } from '@api/organizations/main'
import { OrganizationCard } from './components/OrganizationCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Organizations List',
  description: 'Organizations List Page',
}

const Organizations = async () => {
  const { allIds, byId } = await getOrganizationsListAPI()

  return (
    <div className='app-responsive-flex'>
      {allIds.map((organizationId) => (
        <OrganizationCard key={organizationId} data={byId[organizationId!]} />
      ))}
    </div>
  )
}

export default Organizations
