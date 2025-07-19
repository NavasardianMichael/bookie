import { BasicOrganization } from '@store/organizations/single/types'
import { BasicOrganizationResponse, GetOrganizationAPI, GetOrganizationsListAPI } from './types'

export const processOrganizationsListResponse: GetOrganizationsListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, organization) => {
      const processedOrganization = processBasicOrganizationResponse(organization)
      acc.byId[organization.id] = processedOrganization
      acc.allIds.push(organization.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetOrganizationsListAPI['processed']
  )
}

export const processBasicOrganizationResponse = (organization: BasicOrganizationResponse): BasicOrganization => {
  return organization
}

export const processOrganizationResponse: GetOrganizationAPI['processor'] = (organization) => {
  return organization.value
}
