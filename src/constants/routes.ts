export const ROUTE_KEYS = {
  home: 'home',
  contact: 'contact',
  terms: 'terms',
  privacy: 'privacy',
  categories: 'categories',
  providerCategories: 'providerCategories',
  providers: 'providers',
  organizations: 'organizations',
  consumerProfile: 'consumerProfile',
  consumerProfilePhone: 'consumerProfilePhone',
  consumerProfileAppointments: 'consumerProfileAppointments',
  consumerProfileNotifications: 'consumerProfileNotifications',
  consumerProfilePayments: 'consumerProfilePayments',
  providerProfileCreation: 'providerProfileCreation',
  providerServices: 'providerServices',
  providerProfile: 'providerProfile',
  providerProfileAvailability: 'providerProfileAvailability',
  providerProfileBookings: 'providerProfileBookings',
  providerProfileAnalytics: 'providerProfileAnalytics',
  /** Redirects to Bookings. Kept so old History bookmarks still land somewhere real. */
  providerProfileHistory: 'providerProfileHistory',
  providerProfileSeo: 'providerProfileSeo',
  providerProfileNotifications: 'providerProfileNotifications',
  providerProfilePayments: 'providerProfilePayments',
  /** Vanity link. `/p/<slug>` redirects to the provider's canonical profile URL. */
  providerVanity: 'providerVanity',
  /** Public booking manage page. `/b/<token>` — capability URL, not the appointment id. */
  bookingManage: 'bookingManage',
  /**
   * Review moderation. Guarded by the API's `ADMIN_EMAILS` allowlist, not by this
   * constant — the page is reachable by anyone and simply shows nothing without the
   * grant, because `/admin/*` answers 404 rather than 403 to everyone else.
   */
  adminReviews: 'adminReviews',

  logout: 'logout',
  auth: 'auth',
  accountTypeSelection: 'accountTypeSelection',
  consumerRegistration: 'consumerRegistration',
  providerRegistration: 'providerRegistration',
  signIn: 'signIn',
  forgotPassword: 'forgotPassword',
  resetPassword: 'resetPassword',
  verifyEmail: 'verifyEmail',
  /** Where Google's callback lands the browser once the API has set the session cookie. */
  authCallback: 'authCallback',
  /** Google supplies no role or phone, so a first-time Google user finishes here. */
  completeRegistration: 'completeRegistration',

  routesOverview: 'routesOverview',
} as const

export const ROUTES: Record<keyof typeof ROUTE_KEYS, string> = {
  // Main
  [ROUTE_KEYS.home]: '/',
  [ROUTE_KEYS.contact]: '/contact',
  [ROUTE_KEYS.terms]: '/terms',
  [ROUTE_KEYS.privacy]: '/privacy',
  [ROUTE_KEYS.categories]: '/categories',
  [ROUTE_KEYS.providerCategories]: '/provider-categories',
  [ROUTE_KEYS.providers]: '/providers',
  [ROUTE_KEYS.organizations]: '/organizations',
  [ROUTE_KEYS.consumerProfile]: '/consumers/profile',
  [ROUTE_KEYS.consumerProfilePhone]: '/consumers/profile/phone',
  [ROUTE_KEYS.consumerProfileAppointments]: '/consumers/profile/appointments',
  [ROUTE_KEYS.consumerProfileNotifications]: '/consumers/profile/notifications',
  [ROUTE_KEYS.consumerProfilePayments]: '/consumers/profile/payments',
  [ROUTE_KEYS.providerProfileCreation]: '/providers/profile-creation',
  [ROUTE_KEYS.providerServices]: '/providers/profile-services',
  [ROUTE_KEYS.providerProfile]: '/providers/profile',
  [ROUTE_KEYS.providerProfileAvailability]: '/providers/profile/availability',
  [ROUTE_KEYS.providerProfileBookings]: '/providers/profile/bookings',
  [ROUTE_KEYS.providerProfileAnalytics]: '/providers/profile/analytics',
  [ROUTE_KEYS.providerProfileHistory]: '/providers/profile/history',
  [ROUTE_KEYS.providerProfileSeo]: '/providers/profile/seo',
  [ROUTE_KEYS.providerProfileNotifications]: '/providers/profile/notifications',
  [ROUTE_KEYS.providerProfilePayments]: '/providers/profile/payments',
  [ROUTE_KEYS.providerVanity]: '/p',
  [ROUTE_KEYS.bookingManage]: '/b',
  [ROUTE_KEYS.adminReviews]: '/admin/reviews',

  // Auth
  [ROUTE_KEYS.logout]: '/auth/logout',
  [ROUTE_KEYS.auth]: '/auth',
  [ROUTE_KEYS.accountTypeSelection]: '/auth/account-type-selection',
  [ROUTE_KEYS.consumerRegistration]: '/auth/consumer-registration',
  [ROUTE_KEYS.providerRegistration]: '/auth/provider-registration',
  [ROUTE_KEYS.signIn]: '/auth/sign-in',
  [ROUTE_KEYS.forgotPassword]: '/auth/forgot-password',
  [ROUTE_KEYS.resetPassword]: '/auth/reset-password',
  [ROUTE_KEYS.verifyEmail]: '/auth/verify-email',
  [ROUTE_KEYS.authCallback]: '/auth/callback',
  [ROUTE_KEYS.completeRegistration]: '/auth/complete-registration',

  // Temporary
  [ROUTE_KEYS.routesOverview]: '/routes-overview',
} as const

export const ROUTE_KEYS_BY_VALUES = Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [v, k])) as Record<
  (typeof ROUTES)[keyof typeof ROUTES],
  keyof typeof ROUTES
>
