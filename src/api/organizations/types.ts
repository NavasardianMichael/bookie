import { OrganizationsListState } from '@store/organizations/list/types'
import { BasicOrganization, Organization } from '@store/organizations/single/types'
import { Endpoint } from '@interfaces/api'

export type BasicOrganizationResponse = BasicOrganization
export type OrganizationResponse = Organization

export type GetOrganizationsListAPI = Endpoint<{
  payload: void
  response: BasicOrganizationResponse[]
  processed: OrganizationsListState['list']
}>

export type GetOrganizationAPI = Endpoint<{
  payload: Pick<Organization, 'id'>
  response: OrganizationResponse
  processed: Organization
}>
