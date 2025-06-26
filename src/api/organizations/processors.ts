import { GetOrganizationsListAPI } from './types'

export const processOrganizationsListResponse: GetOrganizationsListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, organization) => {
      acc.byId[organization.id] = organization
      acc.allIds.push(organization.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetOrganizationsListAPI['processed']
  )
}
