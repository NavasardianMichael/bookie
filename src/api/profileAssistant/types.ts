import { ServiceAvailability, WeekSchedule } from '@store/providers/profile/types'
import { Endpoint } from '@interfaces/api'
import { TimeFormat } from '@interfaces/schedule'
import { PaymentMethod, ProviderEmailNotificationPrefs } from '@interfaces/settings'

/**
 * One service in a drafted workspace. `id` names the existing service it is — edited or not —
 * and is `null` for a new one; an active service missing from the list is removed on apply.
 */
export type AssistantService = {
  id: string | null
  name: string
  description: string | null
  /** Minutes. */
  duration: number
  price: number | null
  currency: string | null
  availability: ServiceAvailability
}

/** An existing category by id, or a new one by name — the API links a name it already knows. */
export type AssistantCategory = {
  id: string | null
  name: string
}

/**
 * The whole workspace as the provider's description would have it — every settings tab the
 * assistant can draft. Mirrors `AssistantProposal` in `server/src/services/profileAssistant.ts`.
 * Here rather than in a store: a proposal lives only inside the review sheet's form, its one
 * owner, as photo import's drafts do.
 */
export type AssistantProposal = {
  fullName: string
  description: string | null
  categories: AssistantCategory[]
  /** The active services after apply. */
  services: AssistantService[]
  weekSchedule: WeekSchedule
  timeZone: string | null
  timeFormat: TimeFormat | null
  requiresBookingApproval: boolean
  paymentMethods: PaymentMethod[]
  paymentNotes: string | null
  notifications: ProviderEmailNotificationPrefs
  /** `null` is "no override" — the public page composes its own. */
  seoTitle: string | null
  seoDescription: string | null
  slug: string | null
}

export type ProfileAssistantStatus = {
  /** Never closed or applied: the sheet opens by itself. */
  pending: boolean
  /** This deployment has a Gemini key. */
  available: boolean
  /** `Entitlements.profileAssistantRunsPerDay`; `null` is unlimited. */
  runsPerDay: number | null
  runsToday: number
}

export type GetProfileAssistantStatusAPI = Endpoint<{
  payload: void
  response: ProfileAssistantStatus
  processed: ProfileAssistantStatus
}>

export type GenerateProfileAssistantRequestPayload = {
  description: string
  locale: string
}

export type GenerateProfileAssistantAPI = Endpoint<{
  payload: GenerateProfileAssistantRequestPayload
  response: { proposal: AssistantProposal }
  processed: AssistantProposal
}>

export type ApplyProfileAssistantAPI = Endpoint<{
  payload: AssistantProposal
  response: boolean
  processed: boolean
}>

export type DismissProfileAssistantAPI = Endpoint<{
  payload: void
  response: boolean
  processed: boolean
}>
