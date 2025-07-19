import { GetOrganizationAPI } from '@api/organizations/types'
import { StateCommonProps } from '@interfaces/store'

export type OrganizationState = StateCommonProps & Organization

export type Organization = {
  id: string
  basic: {
    name: string
    category: string
  }
  details: {
    phone: string
    country: string
    address: string
    email: string
    website: string
    logoUrl: string
  }
}

export type OrganizationWithRelations = Organization & {
  providerIds?: string[] // Reference to provider IDs
  appointmentIds?: string[] // Reference to appointment IDs
  reviewIds?: string[] // Reference to review IDs
  averageRating?: number
  totalReviews?: number
  totalProviders?: number
}

export type BasicOrganization = Pick<Organization, 'id' | 'basic'>

export type OrganizationActions = {
  setOrganizationState: (payload: Partial<OrganizationState>) => void
  getOrganization: (args: GetOrganizationAPI['payload']) => void
}
