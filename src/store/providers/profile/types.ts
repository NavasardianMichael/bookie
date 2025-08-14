import { PutProviderProfileAPI } from '@api/providers/types'
import { BasicCategory } from '@store/categories/single/types'
import { BasicOrganization } from '@store/organizations/single/types'
import { Location, PhoneNumber } from '@interfaces/app'
import { Plan } from '@interfaces/plans'
import { StateCommonProps } from '@interfaces/store'

export type ProviderProfileState = StateCommonProps & ProviderProfile

export type ProviderProfile = {
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
    location: Location
    phone: PhoneNumber
    country?: string
    email?: string
  }
  services: ProviderServices[]
  personal: ProviderPersonalValues
}

export type ProviderServices = {
  id: string
  name: string
  description: string
}

type ProviderPersonalValues = {
  plan: Plan
}

export type ProviderProfileActions = {
  setProviderProfileData: (payload: Partial<ProviderProfileState>) => void
  putProviderProfileData: (payload: PutProviderProfileAPI['payload']) => Promise<void>
}
