import { Provider } from '@store/providers/profile/types'
import { ROLES } from '@constants/roles'

export type OrganizationProfileSlice = {
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

export type OrganizationProfileActionPayloads = {
  setOrganizationProfileData: Partial<OrganizationProfileSlice>
}
