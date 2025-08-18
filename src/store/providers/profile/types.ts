import { PutProviderProfileAPI } from '@api/providers/types'
import { BasicCategory, Category } from '@store/categories/single/types'
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
    available: boolean
  }
  details: {
    location: Location
    phone: PhoneNumber
    country?: string
    email?: string
    gallery: GalleryItem[]
    schedule: Record<string, { start: string; end?: string }[]>
  }
  services: ProviderService[]
  personal: ProviderPersonalValues
}

type GalleryItem = {
  name: string
  url: string
}

export type ProviderService = {
  id: string
  name: string
  duration: number
  categoryId: Category['id']
  description?: string
  price?: number
  currency?: string
  image?: string
  missing?: boolean
}

type ProviderPersonalValues = {
  plan: Plan
}

export type ProviderProfileActions = {
  setProviderProfileData: (payload: Partial<ProviderProfileState>) => void
  putProviderProfileData: (payload: PutProviderProfileAPI['payload']) => Promise<void>
}
