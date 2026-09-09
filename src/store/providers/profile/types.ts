import {
  DeleteProviderServiceAPI,
  PostProviderServiceAPI,
  PutProviderProfileAPI,
  PutProviderServiceAPI,
} from '@api/providers/types'
import { BasicCategory, Category } from '@store/categories/single/types'
import { BasicOrganization } from '@store/organizations/single/types'
import { Location, PhoneNumber } from '@interfaces/app'
import { Normalized } from '@interfaces/commons'
import { Plan } from '@interfaces/plans'
import { WeekDay } from '@interfaces/schedule'
import { PaymentInfo, ProviderDraft, ProviderEmailNotificationPrefs } from '@interfaces/settings'
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
    emailVerifiedAt?: string
    gallery: GalleryItem[]
    weekSchedule: WeekSchedule
    emailNotificationPrefs?: ProviderEmailNotificationPrefs
    paymentInfo?: PaymentInfo
  }
  services: Normalized<ProviderService>
  personal: ProviderPersonalValues
  listed?: boolean
  draft?: ProviderDraft | null
  seo?: ProviderSeo
}

/**
 * Owner-authored search metadata. Every field is an **override**: `undefined` means
 * "no override, compose the default from the name, organization and categories", which
 * is what `generateMetadata` on the public profile falls back to. That is why these are
 * optional rather than empty strings — clearing one has to restore the default, not
 * blank the tag.
 *
 * On `basic`/`details`/`services`/`personal`'s level rather than inside `details`
 * because it is neither contact information nor private: these end up as public `<meta>`
 * tags, and the public `GET /providers/:id` payload carries them for exactly that reason.
 */
export type ProviderSeo = {
  title?: string
  description?: string
  /** Comma-joined, the shape the `<meta name="keywords">` tag wants. */
  keywords?: string
  /** Vanity URL segment: `/p/<slug>` redirects to the canonical profile URL. */
  slug?: string
}

export type GalleryItem = {
  name: string
  url: string
}

export type WeekSchedule = Record<WeekDay, DaySchedule>

export type DaySchedule = {
  availability: DaySchedulePart
  breaks: DaySchedulePart[]
}

export type DaySchedulePart = { start: string; end: string }

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
  // setProviderProfileData: (payload: Partial<ProviderProfileState>) => void
  getProviderProfileData: () => Promise<void>
  putProviderProfileData: (payload: PutProviderProfileAPI['payload']) => Promise<void>
  deleteProviderService: (payload: DeleteProviderServiceAPI['payload']) => Promise<void>
  postProviderService: (payload: PostProviderServiceAPI['payload']) => Promise<void>
  putProviderService: (payload: PutProviderServiceAPI['payload']) => Promise<void>
}
