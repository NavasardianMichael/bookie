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
  providerProfileCreation: 'providerProfileCreation',
  providerServices: 'providerServices',
  providerProfile: 'providerProfile',

  logout: 'logout',
  auth: 'auth',
  accountTypeSelection: 'accountTypeSelection',
  consumerRegistration: 'consumerRegistration',
  providerRegistration: 'providerRegistration',
  phoneNumberInput: 'phoneNumberInput',
  codeInput: 'codeInput',
  profileCreated: 'profileCreated',

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
  [ROUTE_KEYS.providerProfileCreation]: '/providers/profile-creation',
  [ROUTE_KEYS.providerServices]: '/providers/profile-services',
  [ROUTE_KEYS.providerProfile]: '/providers/profile',

  // Auth
  [ROUTE_KEYS.logout]: '/auth/logout',
  [ROUTE_KEYS.auth]: '/auth',
  [ROUTE_KEYS.accountTypeSelection]: '/auth/account-type-selection',
  [ROUTE_KEYS.consumerRegistration]: '/auth/consumer-registration',
  [ROUTE_KEYS.providerRegistration]: '/auth/provider-registration',
  [ROUTE_KEYS.phoneNumberInput]: '/auth/phone-number-input',
  [ROUTE_KEYS.codeInput]: '/auth/code-input',
  [ROUTE_KEYS.profileCreated]: '/auth/profile-created',

  // Temporary
  [ROUTE_KEYS.routesOverview]: '/routes-overview',
} as const

export const ROUTE_KEYS_BY_VALUES = Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [v, k])) as Record<
  (typeof ROUTES)[keyof typeof ROUTES],
  keyof typeof ROUTES
>
