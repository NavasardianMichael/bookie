import { Category } from '@store/categories/single/types'
import { Organization } from '@store/organizations/single/types'
import { BasicProvider, ProvidersListPagination, ProvidersListState } from '@store/providers/list/types'
import { ProviderProfile, ProviderSeo, ProviderService } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { Endpoint } from '@interfaces/api'

export type ProviderServiceResponse = ProviderService

export type PutProviderProfileRequestPayload = Partial<{
  firstName: string
  lastName: string
  description: string
  email: string
  address: string
  locationURL: string
  organizationId: Organization['id']
  categoryIds: Category['id'][]
  weekSchedule: ProviderProfile['details']['weekSchedule']
  image: ProviderProfile['basic']['image'] | File
  gallery: (ProviderProfile['details']['gallery'][number] | File)[]
  mode: 'draft' | 'publish' | 'listing'
  listed: boolean
  available: boolean
  emailNotificationPrefs: NonNullable<ProviderProfile['details']['emailNotificationPrefs']>
  paymentInfo: NonNullable<ProviderProfile['details']['paymentInfo']> | null
}>

/** Mirrors the sorts `server/src/services/providerSearch.ts` accepts. */
export type ProvidersListSort = 'recommended' | 'nameAsc' | 'nameDesc' | 'newest'

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
  sort: ProvidersListSort
  /** 1-based. The API clamps it to the last real page. */
  page: number
  perPage: number
}>

export type ProvidersListResponse = {
  items: BasicProvider[]
} & ProvidersListPagination

export type GetProvidersListAPI = Endpoint<{
  payload: ProvidersListQuery | void
  response: ProvidersListResponse
  processed: Pick<ProvidersListState, 'list' | 'pagination'>
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
 * freshly cropped `File` (the API stores it and answers with a URL), and `missing` is a
 * client-side flag that must never be sent.
 */
export type ProviderServiceRequestPayload = Partial<{
  name: ProviderService['name']
  duration: ProviderService['duration']
  categoryId: ProviderService['categoryId']
  /**
   * Typed when the provider wrote a category that may not exist yet. The API
   * matches case-insensitively or creates a Category row. Do not send alongside
   * `categoryId` — an id wins, the same as organization registration.
   */
  categoryName: string
  description: ClearableField<NonNullable<ProviderService['description']>>
  price: ClearableField<NonNullable<ProviderService['price']>>
  currency: ClearableField<NonNullable<ProviderService['currency']>>
  image: ProviderService['image'] | File
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
 * the provider is not currently editing — which matters because the slug saves on its
 * own button while the other three ride the draft/publish bar.
 *
 * `keywords` goes up as an array and comes back comma-joined; the tag input is the only
 * thing that needs the list form.
 */
export type PatchProviderSeoPayload = Partial<{
  seoTitle: ClearableField<string>
  seoDescription: ClearableField<string>
  seoKeywords: string[]
  slug: ClearableField<string>
}>

export type PatchProviderSeoAPI = Endpoint<{
  payload: PatchProviderSeoPayload
  response: ProviderSeo
  processed: ProviderSeo
}>
