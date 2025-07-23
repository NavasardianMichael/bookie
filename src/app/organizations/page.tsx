import { getOrganizationsListAPI } from '@api/organizations/main'
import { OrganizationCard } from './components/OrganizationCard'

export const metadata = {
  title: 'Organizations List',
  description: 'Organizations List Page',
}

const Organizations = async () => {
  try {
    const { allIds, byId } = await getOrganizationsListAPI()
    return (
      <div className='app-responsive-flex'>
        {allIds.map((organizationId) => (
          <OrganizationCard key={organizationId} data={byId[organizationId!]} />
        ))}
      </div>
    )
  } catch (error) {
    return <h1>{JSON.stringify(error)}</h1> // Your custom error component
  }
}
export default Organizations
