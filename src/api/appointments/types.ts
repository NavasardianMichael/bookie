import { BasicProvider } from '@store/providers/list/types'
import { ProviderProfile } from '@store/providers/profile/types'
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
  email: string
}

export type CreateAppointmentPayload = {
  providerId: ProviderProfile['id']
  serviceId: string
  startAt: string
  notes?: string
  /** Narrowed server-side to what the provider actually accepts. */
  paymentMethods?: PaymentMethod[]
  guest?: GuestBookingDetails
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
