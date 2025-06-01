import { Normalized } from '@interfaces/commons'
import { SliceCommonProps } from '@interfaces/store'
import { Organization } from '../profile/types'

export type OrganizationsListSlice = SliceCommonProps & {
  list: Normalized<Organization>
}

export type OrganizationsListActionPayloads = {
  setOrganizationsListSlice: Partial<OrganizationsListSlice>
  setOrganizationList: Partial<OrganizationsListSlice['list']>
}
