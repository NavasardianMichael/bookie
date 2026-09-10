import { PhoneNumber } from '@interfaces/app'

/** Preferred in-person payment method. */
export type PaymentMethod = 'cash' | 'card_on_site' | 'bank_transfer'

export type PaymentInfo = {
  /**
   * Every method the owner accepts, not a single preference — a provider may take
   * cash *and* card on site, and the booking sheet offers exactly this set.
   * Read it through `toPaymentMethods` (`@helpers/payment`), which also tolerates
   * the pre-migration `{ method }` shape.
   */
  methods: PaymentMethod[]
  /**
   * Provider-authored pay-to number (card or bank account). Published on the
   * public profile and in the booking sheet; saving a new or changed value is
   * confirmed in a dialog. Split `cardNumber` / `accountNumber` and a leftover
   * `reference` are still read by `toPaymentShare`.
   */
  payToNumber?: string
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
