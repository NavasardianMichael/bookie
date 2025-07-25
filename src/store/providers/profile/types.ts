import { BasicCategory } from '@store/categories/single/types'
import { BasicOrganization } from '@store/organizations/single/types'
import { Plan } from '@interfaces/plans'
import { ProviderRole } from '@interfaces/roles'
import { StateCommonProps } from '@interfaces/store'

export type ProviderProfileState = StateCommonProps & Provider & ProviderProfile

export type Provider = {
  id: string
  basic: {
    categories: BasicCategory[]
    firstName: string
    lastName: string
    image: string
    organization?: BasicOrganization
  }
  details: {
    phone: string
    country: string
    address: string
    email: string
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
