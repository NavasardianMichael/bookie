import { Organization } from '@store/organizations/profile/types'
import { Plan } from '@interfaces/plans'
import { ProviderRole } from '@interfaces/roles'
import { StateCommonProps } from '@interfaces/store'

export type ProviderProfileState = StateCommonProps & Provider & ProviderProfile

export type Provider = {
  id: string
  basic: {
    category: string
    firstName: string
    lastName: string
    image: string
  }
  details: {
    phone: string
    country: string
    address: string
    email: string
    organization?: Organization
  }
  services: ProviderServices[]
}

export type BasicProvider = Pick<Provider, 'id' | 'basic'>

export type ProviderServices = {
  id: string
  name: string
  description: string
}

export type ProviderProfile = {
  role: ProviderRole
  plan: Plan
}

export type ProviderProfileActions = {
  setProviderProfileData: (payload: Partial<ProviderProfileState>) => void
}
