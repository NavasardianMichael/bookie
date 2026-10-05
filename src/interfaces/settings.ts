import { PhoneNumber } from '@interfaces/app'
import { TimeFormat } from '@interfaces/schedule'

/** Preferred in-person payment method. */
export type PaymentMethod = 'cash' | 'card_on_site' | 'bank_transfer'

/** Minutes before an appointment to send a reminder email. */
export type AppointmentReminderLeadMinutes = 15 | 60 | 360 | 1440

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
  /** Minutes before the appointment to send the reminder. Ignored when reminders are off. */
  appointmentReminderMinutes: AppointmentReminderLeadMinutes
  bookingChanges: boolean
}

export type ProviderEmailNotificationPrefs = {
  appointmentReminders: boolean
  /** Minutes before the appointment to send the reminder. Ignored when reminders are off. */
  appointmentReminderMinutes: AppointmentReminderLeadMinutes
  bookingChanges: boolean
  newBooking: boolean
}

export type ProviderDraft = {
  firstName?: string
  lastName?: string
  description?: string | null
  imageUrl?: string | null
  weekSchedule?: unknown
  /** Drafted with `weekSchedule` — it decides what instant each of those hours is. */
  timeZone?: string
  /** Drafted with `timeZone`, beside which it is edited. */
  timeFormat?: TimeFormat
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

/**
 * The account's Telegram link — `GET /telegram/status`. One per account, shared by both
 * workspaces. `available` is false when the deployment has no bot configured.
 */
export type TelegramStatus = {
  available: boolean
  linked: boolean
  username?: string
}
