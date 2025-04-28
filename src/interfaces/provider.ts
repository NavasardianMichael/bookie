import { PROVIDER_ROLES } from '@constants/roles'

export type ProviderRole = (typeof PROVIDER_ROLES)[keyof typeof PROVIDER_ROLES]

export type Provider = {
  id: string
  name: string
  phone: string
  userType: string
  firstName: string
  lastName: string
  email: string
  image?: string
  role: ProviderRole
}
