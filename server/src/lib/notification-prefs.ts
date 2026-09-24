/**
 * Email-notification JSON on Provider / Consumer.
 *
 * Stored as opaque `Json`; this is the only reader/writer so a leftover `{}` or a
 * crafted payload cannot leave `appointmentReminderMinutes` as 7, or drop a boolean
 * the GET defaults would otherwise re-fill on every load.
 *
 * Mirror of `src/constants/settings.ts` — server is a separate package with no
 * import path into `src/`.
 */

export const APPOINTMENT_REMINDER_LEAD_MINUTES = [15, 60, 360, 1440] as const
export type AppointmentReminderLeadMinutes = (typeof APPOINTMENT_REMINDER_LEAD_MINUTES)[number]
export const DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES: AppointmentReminderLeadMinutes = 1440

const isLead = (value: unknown): value is AppointmentReminderLeadMinutes =>
  typeof value === 'number' && (APPOINTMENT_REMINDER_LEAD_MINUTES as readonly number[]).includes(value)

const asBool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback)

const asObject = (raw: unknown): Record<string, unknown> =>
  raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

export const defaultProviderNotificationPrefs = {
  appointmentReminders: true,
  appointmentReminderMinutes: DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
  bookingChanges: true,
  newBooking: true,
}

export const defaultConsumerNotificationPrefs = {
  appointmentReminders: true,
  appointmentReminderMinutes: DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
  bookingChanges: true,
}

export const mergeProviderNotificationPrefs = (raw: unknown) => {
  const obj = asObject(raw)
  return {
    appointmentReminders: asBool(obj.appointmentReminders, defaultProviderNotificationPrefs.appointmentReminders),
    appointmentReminderMinutes: isLead(obj.appointmentReminderMinutes)
      ? obj.appointmentReminderMinutes
      : defaultProviderNotificationPrefs.appointmentReminderMinutes,
    bookingChanges: asBool(obj.bookingChanges, defaultProviderNotificationPrefs.bookingChanges),
    newBooking: asBool(obj.newBooking, defaultProviderNotificationPrefs.newBooking),
  }
}

export const mergeConsumerNotificationPrefs = (raw: unknown) => {
  const obj = asObject(raw)
  return {
    appointmentReminders: asBool(obj.appointmentReminders, defaultConsumerNotificationPrefs.appointmentReminders),
    appointmentReminderMinutes: isLead(obj.appointmentReminderMinutes)
      ? obj.appointmentReminderMinutes
      : defaultConsumerNotificationPrefs.appointmentReminderMinutes,
    bookingChanges: asBool(obj.bookingChanges, defaultConsumerNotificationPrefs.bookingChanges),
  }
}
