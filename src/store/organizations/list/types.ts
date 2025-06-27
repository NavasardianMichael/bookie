import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'
import { BasicOrganization } from '../profile/types'

export type OrganizationsListState = StateCommonProps & {
  list: Normalized<BasicOrganization>
}

export type OrganizationsListActions = {
  setOrganizationsListState: (payload: Partial<OrganizationsListState>) => void
  setOrganizationList: (payload: Partial<OrganizationsListState['list']>) => void
}
