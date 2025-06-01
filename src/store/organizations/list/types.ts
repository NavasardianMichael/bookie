import { Normalized } from '@interfaces/commons'
import { Organization } from '../profile/types'

export type OrganizationsListSlice = {
  list: Normalized<Organization>
}

export type OrganizationsListActionPayloads = {
  setOrganizationsList: Partial<OrganizationsListSlice>
}
