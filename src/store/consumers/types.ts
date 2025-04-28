import { ProviderProfileSlice } from '@store/providers/profile/types'
import { ROLES } from '@constants/roles'

export type ProfileSlice = {
  data: ProviderProfileSlice['info']
  isLoggedIn: boolean
  isPending: boolean
  errorMessage: Error['message']
}

export type Profile = {
  id: string
  userType: string
  firstName: string
  lastName: string
  phone: string
  email: string
  image?: string
  role: Role
}

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type ProfileActionPayloads = {
  setProfileData: Partial<Profile>
  setIsLoggedIn: ProfileSlice['isLoggedIn']
}
