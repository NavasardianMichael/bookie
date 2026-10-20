import { Organization } from '@store/organizations/single/types'
import { ProviderListItem, ProvidersListPagination, ProvidersListState } from '@store/providers/list/types'
import { ProviderProfile, ProviderSeo, ProviderService } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { Endpoint } from '@interfaces/api'
import { CategoryChoicePayload, NewOrganizationPayload } from '@interfaces/auth'

export type ProviderServiceResponse = ProviderService

export type PutProviderProfileRequestPayload = Partial<{
  fullName: string
  description: string
  address: string
  locationURL: string
  organizationId: Organization['id']
  weekSchedule: ProviderProfile['details']['weekSchedule']
  /** IANA name; the API stores it canonical and answers 400 for one `Intl` does not know. */
  timeZone: NonNullable<ProviderProfile['details']['timeZone']>
  /** Drafted and published with `timeZone`; the API answers 400 for anything but `h12`/`h24`. */
  timeFormat: NonNullable<ProviderProfile['details']['timeFormat']>
  /** Drafted with `timeFormat`. One flag for the visitor's time-zone list and 12/24-hour switch. */
  showClockChoices: boolean
  image: ProviderProfile['basic']['image'] | File
  /** Draft save: drop the portrait. Publish then writes `imageUrl` null. A file wins if both are sent. */
  clearImage?: boolean
  gallery: (ProviderProfile['details']['gallery'][number] | File)[]
  mode: 'draft' | 'publish' | 'listing'
  listed: boolean
  available: boolean
  emailNotificationPrefs: NonNullable<ProviderProfile['details']['emailNotificationPrefs']>
  paymentInfo: NonNullable<ProviderProfile['details']['paymentInfo']> | null
  /** Saved live, like the vanity slug — it changes nothing anyone can see. */
  requiresBookingApproval: boolean
  /** Saved live — whether the contact phone appears on the public profile. */
  phoneVisible: boolean
}>

/** Mirrors the sorts `server/src/services/providerSearch.ts` accepts. */
export type ProvidersListSort = 'recommended' | 'topRated' | 'nameAsc' | 'nameDesc' | 'newest'

/**
 * Explore's query string, serialised by `paramsToQueryString` — so every field is
 * optional and an omitted one means "the API's default", never "false".
 */
export type ProvidersListQuery = Partial<{
  q: string
  categoryId: string
  /** Only providers currently taking bookings. */
  available: boolean
  /** Only providers whose weekly schedule has hours on today's weekday. */
  openToday: boolean
  /**
   * Only providers the signed-in account has saved. The API reads the session; with no
   * session the list is empty. Not a query the suggestions box invents on its own.
   */
  favorites: boolean
  sort: ProvidersListSort
  /** 1-based. The API clamps it to the last real page. */
  page: number
  perPage: number
}>

export type ProvidersListResponse = {
  items: ProviderListItem[]
} & ProvidersListPagination

export type GetProvidersListAPI = Endpoint<{
  /**
   * `cookie` is forwarded by a Server Component and never put on the query string.
   * The browser already sends its own session (`withCredentials`).
   */
  payload: (ProvidersListQuery & { cookie?: string }) | void
  response: ProvidersListResponse
  processed: Pick<ProvidersListState, 'list' | 'pagination'>
}>

/**
 * One booked interval, as UTC ISO instants. Deliberately not slots: a slot only exists
 * once a service duration is chosen, and that is the visitor's to pick — which is why
 * the server's old slot endpoint went unused for as long as it existed
 * (`docs/BACKLOG.md` #6). The client steps the grid; this says what is already gone.
 */
export type ProviderBusyInterval = {
  startAt: string
  endAt: string
}

export type GetProviderBusyAPI = Endpoint<{
  payload: { id: string; from: string; to: string }
  response: ProviderBusyInterval[]
  processed: ProviderBusyInterval[]
}>

export type GetSingleProviderAPI = Endpoint<{
  /**
   * `cookie` is transport-only: Server Components forward the incoming session
   * so the API can recognise the owner of an unlisted profile. Never a query
   * or body field.
   */
  payload: Pick<SingleProvider, 'id'> & { cookie?: string }
  response: SingleProvider
  processed: SingleProvider
}>

export type GetProviderProfileAPI = Endpoint<{
  payload: void
  response: ProviderProfile
  processed: ProviderProfile
}>

export type PutProviderProfileAPI = Endpoint<{
  payload: PutProviderProfileRequestPayload
  response: ProviderProfile
  processed: ProviderProfile
}>

export type DeleteProviderProfileAPI = Endpoint<{
  payload: void
}>

export type DeleteProviderServiceAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    serviceId: ProviderService['id']
  }
}>

/**
 * A field the provider can empty again.
 *
 * The API reads three states per field: absent means "leave this column alone", `''`
 * means "clear it", anything else is the new value. `''` is the only marker that
 * survives both transports — axios drops `undefined` *and* `null` when it serialises a
 * multipart body, so a cleared price would silently stay put whenever an image came
 * along with it, and not otherwise.
 */
export type ClearableField<T> = T | ''

/**
 * What a service edit puts on the wire. Spelled out rather than derived from
 * `ProviderService` so the two differences from the entity stay visible: `image` may be a
 * freshly cropped `File` (the API stores it and answers with a URL), and `active` is the
 * activate/deactivate toggle — absent leaves the column alone; a create defaults to active.
 */
export type ProviderServiceRequestPayload = Partial<{
  name: ProviderService['name']
  duration: ProviderService['duration']
  description: ClearableField<NonNullable<ProviderService['description']>>
  price: ClearableField<NonNullable<ProviderService['price']>>
  currency: ClearableField<NonNullable<ProviderService['currency']>>
  image: ProviderService['image'] | File
  /**
   * An existing `/uploads/…` path to reuse when creating a service. Kept only when one
   * of this provider's services already stores it. A new photo is still a `File` on
   * `image`; edits do not send this.
   */
  imageUrl?: string
  active: boolean
}>

export type PostProviderServiceAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    service: ProviderServiceRequestPayload
  }
  response: ProviderServiceResponse
  processed: ProviderService
}>

export type PutProviderServiceAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    serviceId: ProviderService['id']
    service: ProviderServiceRequestPayload
  }
  response: ProviderServiceResponse
  processed: ProviderService
}>

/**
 * Search metadata and the vanity slug.
 *
 * A `PATCH` with three states per field, matching `ClearableField` above: an **absent**
 * key leaves the column alone, `''` clears the override back to the composed default,
 * and anything else is the new value. Sending only `slug` therefore cannot wipe a title
 * the provider is not currently editing.
 */
export type PatchProviderSeoPayload = Partial<{
  seoTitle: ClearableField<string>
  seoDescription: ClearableField<string>
  slug: ClearableField<string>
}>

export type PatchProviderSeoAPI = Endpoint<{
  payload: PatchProviderSeoPayload
  response: ProviderSeo
  processed: ProviderSeo
}>

/**
 * The settings Organization section, applied live. Registration's two shapes — an existing
 * organization's id, or a new one to create (`allowSimilar` once the provider has seen the
 * similar names) — plus `organizationId: null`, which detaches.
 */
export type PatchProviderOrganizationPayload =
  | { organizationId: Organization['id'] | null }
  | { newOrganization: NewOrganizationPayload }

export type PatchProviderOrganizationAPI = Endpoint<{
  payload: PatchProviderOrganizationPayload
  response: ProviderProfile
  processed: ProviderProfile
}>

/**
 * The settings Categories field, applied live: the full list, which replaces the current
 * one — `[]` clears it. At most `MAX_PROVIDER_CATEGORIES`; the API answers 400 for more.
 */
export type PutProviderCategoriesAPI = Endpoint<{
  payload: { categories: CategoryChoicePayload[] }
  response: ProviderProfile
  processed: ProviderProfile
}>
