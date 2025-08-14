import { BasicCategory } from '@store/categories/single/types'
import { BasicOrganization } from '@store/organizations/single/types'
import { Location } from '@interfaces/app'
import { Plan } from '@interfaces/plans'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { ProviderRole } from '@interfaces/roles'
import { StateCommonProps } from '@interfaces/store'

export type ProviderProfileState = StateCommonProps & Provider & ProviderProfile

export type Provider = {
  id: string
  basic: {
    firstName: string
    lastName: string
    description?: string
    image?: string
    categories?: BasicCategory[]
    organization?: BasicOrganization
  }
  details: {
    phone: string
    country: string
    location: Location
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
  putProviderProfileData: (payload: ProviderProfileFormValues) => Promise<void>
}
