import { BasicProvider } from '@store/providers/list/types'
import { ProviderProfile } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { Endpoint } from '@interfaces/api'
import { PhoneNumber } from '@interfaces/app'
import { PaymentMethod } from '@interfaces/settings'

/**
 * Contact details for a booking made without an account.
 *
 * Only sent by a visitor with no session — a signed-in caller has its identity read
 * off the session cookie and these ignored, so sending them cannot book under someone
 * else's name.
 */
export type GuestBookingDetails = {
  firstName: string
  lastName: string
  phone: PhoneNumber
  email?: string
}

export type CreateAppointmentPayload = {
  providerId: ProviderProfile['id']
  serviceId: string
  startAt: string
  notes?: string
  /** Narrowed server-side to what the provider actually accepts. */
  paymentMethods?: PaymentMethod[]
  guest?: GuestBookingDetails
  /** UI locale for the manage URL in the confirmation email. */
  locale?: string
}

export type AppointmentResponse = {
  id: string
  providerId: string
  serviceId: string
  /** Absent on a guest booking, where `guest` carries the booker instead. */
  consumerId?: string
  time: {
    startDate: string
    endDate: string
    duration: number
  }
  status: string
  notes?: string
  paymentMethods?: PaymentMethod[]
  createdAt?: string
  updatedAt?: string
  provider?: BasicProvider
  service?: { id: string; name: string }
  consumer?: {
    id: string
    basic: { firstName: string; lastName: string }
  }
  guest?: {
    firstName: string
    lastName: string
    phone: PhoneNumber
    email?: string
  }
  /**
   * Capability token for `/b/<token>`. The emailed raw value is returned only on
   * create. A consumer's own list returns a reconstructable owner token that the
   * same manage routes accept; manage GET never echoes either form.
   */
  manageToken?: string
  emailSent?: boolean
}

export type CreateAppointmentAPI = Endpoint<{
  payload: CreateAppointmentPayload
  response: AppointmentResponse
  processed: AppointmentResponse
}>

export type ListAppointmentsAPI = Endpoint<{
  payload: void
  response: AppointmentResponse[]
  processed: AppointmentResponse[]
}>

/* ------------------------------------------------------------------ *
 * The provider workspace's view of its own bookings.
 * ------------------------------------------------------------------ */

export const BOOKING_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const PROVIDER_BOOKINGS_SORTS = ['startDesc', 'startAsc', 'createdDesc', 'nameAsc'] as const

export type ProviderBookingsSort = (typeof PROVIDER_BOOKINGS_SORTS)[number]

/**
 * Whoever booked, flattened across the two identities a booking can carry: a signed-in
 * `Consumer` or the guest columns on the appointment itself. `kind` says which, so a row
 * can label a guest without inferring it from a missing id.
 */
export type BookingBooker = {
  /** `provider` is the other professional, on the consumer-side workspace list. */
  kind: 'consumer' | 'guest' | 'provider'
  id?: string
  firstName: string
  lastName: string
  email?: string
  /** Present on the receiving-provider list; omitted when the row is the other provider. */
  phone?: PhoneNumber
}

export type ProviderBooking = {
  id: string
  time: {
    startDate: string
    endDate: string
    duration: number
  }
  status: BookingStatus
  notes?: string
  paymentMethods?: PaymentMethod[]
  /** The snapshot taken when the booking was made, not the service's price today. */
  price?: number
  currency?: string
  createdAt: string
  service: { id: string; name: string }
  booker: BookingBooker
}

/** Omitted fields mean the API's default, never an explicit `false` or empty filter. */
export type ProviderBookingsQuery = Partial<{
  from: string
  to: string
  status: BookingStatus[]
  serviceId: string
  q: string
  sort: ProviderBookingsSort
  page: number
  perPage: number
}>

export type ProviderBookingsPagination = {
  total: number
  page: number
  perPage: number
  pageCount: number
}

export type ProviderBookingsResponse = {
  items: ProviderBooking[]
} & ProviderBookingsPagination

/** Per-day counts for the calendar grid, keyed `YYYY-MM-DD` in the requested timezone. */
export type ProviderBookingsCalendarResponse = {
  month: string
  timeZone: string
  days: Record<string, { total: number; live: number }>
}

export type GetProviderBookingsAPI = Endpoint<{
  payload: ProviderBookingsQuery | void
  response: ProviderBookingsResponse
  processed: ProviderBookingsResponse
}>

export type GetProviderBookingsCalendarAPI = Endpoint<{
  payload: { month: string }
  response: ProviderBookingsCalendarResponse
  processed: ProviderBookingsCalendarResponse['days']
}>

/** Same envelope as the receiving-provider list; a different `where`. */
export type GetProviderConsumerBookingsAPI = GetProviderBookingsAPI
export type GetProviderConsumerBookingsCalendarAPI = GetProviderBookingsCalendarAPI

export type PatchAppointmentStatusAPI = Endpoint<{
  payload: { id: string; status: BookingStatus }
  response: { id: string; status: BookingStatus }
  processed: { id: string; status: BookingStatus }
}>

export type ManagedAppointment = {
  id: string
  status: BookingStatus
  notes?: string
  paymentMethods?: PaymentMethod[]
  time: {
    startDate: string
    endDate: string
    duration: number
  }
  price?: number
  currency?: string
  service: { id: string; name: string; description?: string }
  guest?: GuestBookingDetails
  consumer?: { firstName: string; lastName: string }
}

export type ManagedAppointmentPayload = {
  appointment: ManagedAppointment
  provider: SingleProvider
}

export type GetManagedAppointmentAPI = Endpoint<{
  payload: { token: string; cookie?: string }
  response: ManagedAppointmentPayload
  processed: ManagedAppointmentPayload
}>

export type PatchManagedAppointmentPayload = { token: string; locale?: string } & (
  | { status: 'cancelled' }
  | { serviceId: string; startAt: string }
)

export type PatchManagedAppointmentAPI = Endpoint<{
  payload: PatchManagedAppointmentPayload
  response: ManagedAppointmentPayload
  processed: ManagedAppointmentPayload
}>
