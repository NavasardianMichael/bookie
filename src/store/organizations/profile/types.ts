import { Provider } from '@store/providers/profile/types'
import { StateCommonProps } from '@interfaces/store'

export type OrganizationProfileState = StateCommonProps & {
  info: Organization
  services: OrganizationService[]
  providerIds: Provider['id'][]
}

export type OrganizationService = {
  id: string
  name: string
  description: string
}

export type Organization = BasicOrganization & {
  address: string
}

export type BasicOrganization = {
  id: string
  name: string
}

export type OrganizationProfileActions = {
  setOrganizationProfileData: (payload: Partial<OrganizationProfileState>) => void
  setOrganizationInfo: (payload: Partial<OrganizationProfileState['info']>) => void
}
