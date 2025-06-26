import { Normalized } from '@interfaces/commons'
import { SliceCommonProps } from '@interfaces/store'
import { Organization } from '../profile/types'

export type OrganizationsListState = SliceCommonProps & {
  list: Normalized<Organization>
}

export type OrganizationsListActions = {
  setOrganizationsListSlice: (payload: Partial<OrganizationsListState>) => void
  setOrganizationList: (payload: Partial<OrganizationsListState['list']>) => void
}
