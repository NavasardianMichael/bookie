import { Provider } from '@store/providers/profile/types'
import { SliceCommonProps } from '@interfaces/store'
import { ROLES } from '@constants/roles'

export type OrganizationProfileSlice = SliceCommonProps & {
  info: Organization
  services: OrganizationService[]
  providerIds: Provider['id'][]
}

export type OrganizationService = {
  id: string
  name: string
  description: string
}

export type Organization = {
  id: string
  name: string
}

export type OrganizationRole = (typeof ROLES)[keyof typeof ROLES]

export type OrganizationProfileActions = {
  setOrganizationProfileData: (payload: Partial<OrganizationProfileSlice>) => void
  setOrganizationInfo: (payload: Partial<OrganizationProfileSlice['info']>) => void
}
