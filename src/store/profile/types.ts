import { ROLES } from "@constants/roles"

export type ProfileSlice = {
  data: Profile
  isLoggedIn: boolean
  errorMessage: Error['message']
}

export type Profile = {
  id: string
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
}
