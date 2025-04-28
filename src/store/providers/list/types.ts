import { ROLES } from '@constants/roles'
import { ProviderProfileSlice } from '../profile/types'

export type ProvidersSlice = {
  list: ProviderProfileSlice[]
}

export type Profile = {
  id: string
  userType: string
  firstName: string
  lastName: string
  phone: string
  email: string
  image: string
  role: Role
}

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type ProfileActionPayloads = {
  setProfileData: Partial<ProvidersSlice>
}
