import { OrganizationsListState } from '@store/organizations/list/types'
import { BasicOrganization } from '@store/organizations/profile/types'
import { Endpoint } from '@interfaces/api'

type BasicOrganizationResponse = BasicOrganization

export type GetOrganizationsListAPI = Endpoint<{
  payload: void
  response: BasicOrganizationResponse[]
  processed: OrganizationsListState['list']
}>
