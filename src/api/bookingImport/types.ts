import { Endpoint } from '@interfaces/api'
import { PhoneNumber } from '@interfaces/app'

/**
 * One booking read off the photo, every field possibly unreadable — `null` is a field the
 * review sheet asks the provider to fill. Mirrors `BookingDraft` in
 * `server/src/services/bookingImport.ts`. Here rather than in a store: the drafts live only
 * inside the review sheet's form, which is their one owner.
 */
export type BookingDraft = {
  fullName: string | null
  /** Digits, with a leading `+` only when one was written. */
  phone: string | null
  serviceId: string | null
  /** `YYYY-MM-DD` on the provider's calendar. */
  date: string | null
  /** 24-hour `HH:mm` on the provider's clock. */
  time: string | null
  notes: string | null
}

export type ParseBookingPhotoRequestPayload = {
  image: File
  /** Context for the reader — which day the sheet covers, what an abbreviation means. */
  note?: string
  locale: string
}

export type ParseBookingPhotoAPI = Endpoint<{
  payload: ParseBookingPhotoRequestPayload
  response: { drafts: BookingDraft[] }
  processed: BookingDraft[]
}>

/** One reviewed booking, as the API writes it. */
export type ImportedBookingRequest = {
  serviceId: string
  /** ISO instant — the provider's wall-clock pick, converted in their zone. */
  startAt: string
  fullName: string
  phone: PhoneNumber
  notes?: string
}

export type CreateImportedBookingsRequestPayload = {
  bookings: ImportedBookingRequest[]
  locale: string
}

export type CreateImportedBookingsAPI = Endpoint<{
  payload: CreateImportedBookingsRequestPayload
  response: { created: number }
  processed: number
}>
