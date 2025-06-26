import { Organization } from '@store/organizations/profile/types'
import { Plan } from '@interfaces/plans'
import { ProviderRole } from '@interfaces/roles'

export type ProviderProfileState = {
  info: Provider
  services: ProviderServices[]
  organizationId: Organization['id']
  isPending: boolean
  error: Error | null
}

export type ProviderServices = {
  id: string
  name: string
  description: string
}

export type Provider = {
  id: string
  basic: {
    firstName: string
    lastName: string
    phone: string
    email: string
    image?: string
  }
  details: {
    role: ProviderRole
    plan: Plan
  }
}

export type BasicProvider = Pick<Provider, 'id' | 'basic'>

export type ProviderProfileActions = {
  setProviderProfileData: (payload: Partial<ProviderProfileState>) => void
  setProviderInfo: (payload: Partial<ProviderProfileState['info']>) => void
}
