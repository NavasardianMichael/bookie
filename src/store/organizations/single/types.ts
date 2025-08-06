import { GetOrganizationAPI } from '@api/organizations/types'
import { BasicCategory } from '@store/categories/single/types'
import { Location } from '@interfaces/app'
import { StateCommonProps } from '@interfaces/store'

export type OrganizationState = StateCommonProps & Organization

export type Organization = {
  id: string
  basic: {
    name: string
    categories: BasicCategory[]
    description: string
  }
  details: {
    phone: string
    country: string
    location: Location
    email: string
    website: string
    logoUrl: string
  }
}

export type BasicOrganization = Pick<Organization, 'id' | 'basic'>

export type OrganizationActions = {
  setOrganizationState: (payload: Partial<OrganizationState>) => void
  getOrganization: (args: GetOrganizationAPI['payload']) => void
}
