import { OrganizationsList } from './OrganizationsList'

export const metadata = {
  title: 'Organizations List',
  description: 'Organizations List Page',
}

const Organizations = async () => {
  return (
    <div>
      <OrganizationsList />
    </div>
  )
}
export default Organizations
