import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import type { SettingsNavItem } from '@components/ui/layout/SettingsShell'

export const PAYMENT_METHODS = ['cash', 'card_on_site', 'bank_transfer'] as const

export const DEFAULT_CONSUMER_NOTIFICATION_PREFS = {
  appointmentReminders: true,
  bookingChanges: true,
  marketing: false,
} as const

export const DEFAULT_PROVIDER_NOTIFICATION_PREFS = {
  appointmentReminders: true,
  bookingChanges: true,
  newBooking: true,
} as const

/** Route names used as i18n keys under Settings.nav.* */
export const CONSUMER_SETTINGS_NAV: { route: keyof typeof ROUTES; match?: 'exact' | 'prefix' }[] = [
  { route: ROUTE_KEYS.consumerProfile, match: 'exact' },
  { route: ROUTE_KEYS.consumerProfilePhone },
  { route: ROUTE_KEYS.consumerProfileAppointments },
  { route: ROUTE_KEYS.consumerProfileNotifications },
  { route: ROUTE_KEYS.consumerProfilePayments },
]

/**
 * Running the business sits above configuring it: Bookings and Analytics are opened
 * daily, the tabs around them are opened once. `match: 'exact'` on the profile home is
 * load-bearing — `/providers/profile` is a prefix of every nested tab, so without it the
 * Profile item lights up on all of them.
 */
export const PROVIDER_SETTINGS_NAV: { route: keyof typeof ROUTES; match?: 'exact' | 'prefix' }[] = [
  { route: ROUTE_KEYS.providerProfile, match: 'exact' },
  { route: ROUTE_KEYS.providerProfileBookings },
  { route: ROUTE_KEYS.providerProfileAnalytics },
  { route: ROUTE_KEYS.providerProfileAvailability },
  { route: ROUTE_KEYS.providerServices },
  { route: ROUTE_KEYS.providerProfileSeo },
  { route: ROUTE_KEYS.providerProfileNotifications },
  { route: ROUTE_KEYS.providerProfilePayments },
]

export const toSettingsNavItems = (
  entries: { route: keyof typeof ROUTES; match?: 'exact' | 'prefix' }[],
  labels: Record<string, string>,
  icons: Record<string, SettingsNavItem['icon']>
): SettingsNavItem[] =>
  entries.map(({ route, match }) => ({
    href: ROUTES[route],
    label: labels[route] ?? route,
    icon: icons[route],
    match,
  }))
