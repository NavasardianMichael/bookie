import { PhoneNumber } from '@interfaces/app'

/** Preferred in-person payment method — never a card PAN. */
export type PaymentMethod = 'cash' | 'card_on_site' | 'bank_transfer' | 'other'

export type PaymentInfo = {
  method: PaymentMethod
  /** Copyable reference the owner types (IBAN, "pay at desk", …). */
  reference?: string
  notes?: string
}

export type ConsumerEmailNotificationPrefs = {
  appointmentReminders: boolean
  bookingChanges: boolean
  marketing: boolean
}

export type ProviderEmailNotificationPrefs = {
  appointmentReminders: boolean
  bookingChanges: boolean
  newBooking: boolean
}

export type ProviderDraft = {
  firstName?: string
  lastName?: string
  description?: string | null
  imageUrl?: string | null
  weekSchedule?: unknown
  available?: boolean
  paymentInfo?: PaymentInfo | null
}

export type ChangePhonePayload = {
  phone: PhoneNumber
}

export type ConfirmOtpPayload = {
  otp: number | string
}

export type ChangeEmailPayload = {
  email: string
}
