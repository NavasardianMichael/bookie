import { ROLES } from '@constants/roles'

export type ProviderProfileSlice = {
  info: ProviderInfo
  services: ProviderService[]
  members: ProviderInfo[]
  isLoggedIn: boolean
}

export type ProviderService = {
  id: string
  name: string
  description: string
}

export type ProviderInfo = {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  image?: string
  role: Role
}

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type ProviderProfileActionPayloads = {
  setProfileData: Partial<ProviderProfileSlice>
  setIsLoggedIn: ProviderProfileSlice['isLoggedIn']
}
