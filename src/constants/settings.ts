import type { AppointmentReminderLeadMinutes } from '@interfaces/settings'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import type { SettingsNavItem } from '@components/ui/layout/SettingsShell'

export const PAYMENT_METHODS = ['cash', 'card_on_site', 'bank_transfer'] as const

/** Offered when Appointment Reminders is on. Default is 24 hours, matching the old copy. */
export const APPOINTMENT_REMINDER_LEAD_MINUTES = [15, 60, 360, 1440] as const satisfies readonly AppointmentReminderLeadMinutes[]

export const DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES: AppointmentReminderLeadMinutes = 1440

export const isAppointmentReminderLeadMinutes = (value: unknown): value is AppointmentReminderLeadMinutes =>
  typeof value === 'number' && (APPOINTMENT_REMINDER_LEAD_MINUTES as readonly number[]).includes(value)

export const toAppointmentReminderLeadMinutes = (value: unknown): AppointmentReminderLeadMinutes =>
  isAppointmentReminderLeadMinutes(value) ? value : DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES

export const DEFAULT_CONSUMER_NOTIFICATION_PREFS = {
  appointmentReminders: true,
  appointmentReminderMinutes: DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
  bookingChanges: true,
  marketing: false,
} as const

export const DEFAULT_PROVIDER_NOTIFICATION_PREFS = {
  appointmentReminders: true,
  appointmentReminderMinutes: DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
  bookingChanges: true,
  newBooking: true,
} as const

/** Route names used as i18n keys under Settings.nav.* */
export const CONSUMER_SETTINGS_NAV: { route: keyof typeof ROUTES; match?: 'exact' | 'prefix' }[] = [
  { route: ROUTE_KEYS.consumerProfile, match: 'exact' },
  { route: ROUTE_KEYS.consumerProfileAppointments },
  { route: ROUTE_KEYS.consumerProfileNotifications },
]

/**
 * Running the business sits above configuring it: Bookings and Analytics are opened
 * daily, the tabs around them are opened once. `match: 'exact'` on the profile home
 * is load-bearing — `/providers/profile` is a prefix of every nested tab, so without
 * it the Profile item lights up on all of them.
 */
export const PROVIDER_SETTINGS_NAV: {
  route: keyof typeof ROUTES
  match?: 'exact' | 'prefix'
  aliases?: (keyof typeof ROUTES)[]
}[] = [
  { route: ROUTE_KEYS.providerProfile, match: 'exact' },
  {
    route: ROUTE_KEYS.providerProfileBookings,
    aliases: [ROUTE_KEYS.providerProfileConsumerBookings],
  },
  // Directly under Bookings, and above Analytics: it is the third "running the business"
  // tab, and the only one with a queue that goes stale if nobody opens it.
  { route: ROUTE_KEYS.providerProfileApprovals },
  { route: ROUTE_KEYS.providerProfileAnalytics },
  { route: ROUTE_KEYS.providerProfileAvailability },
  { route: ROUTE_KEYS.providerServices },
  { route: ROUTE_KEYS.providerProfileSeo },
  { route: ROUTE_KEYS.providerProfileNotifications },
  { route: ROUTE_KEYS.providerProfilePayments },
]

export const toSettingsNavItems = (
  entries: { route: keyof typeof ROUTES; match?: 'exact' | 'prefix'; aliases?: (keyof typeof ROUTES)[] }[],
  /** `SettingsNavItem['label']`, so a caller may pass a decorated node — see the badge on Approvals. */
  labels: Record<string, SettingsNavItem['label']>,
  icons: Record<string, SettingsNavItem['icon']>
): SettingsNavItem[] =>
  entries.map(({ route, match, aliases }) => ({
    href: ROUTES[route],
    label: labels[route] ?? route,
    icon: icons[route],
    match,
    aliases: aliases?.map((name) => ROUTES[name]),
  }))
