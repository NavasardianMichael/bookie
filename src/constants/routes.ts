export const ROUTE_KEYS = {
  home: 'home',
  contact: 'contact',
  categories: 'categories',
  providerCategories: 'providerCategories',
  providers: 'providers',
  consumers: 'consumers',
  organizations: 'organizations',
  consumerProfile: 'consumerProfile',
  providerProfileCreation: 'providerProfileCreation',
  providerProfile: 'providerProfile',

  signOn: 'signOn',
  logout: 'logout',
  auth: 'auth',
  accountTypeSelection: 'accountTypeSelection',
  phoneNumberInput: 'phoneNumberInput',
  codeInput: 'codeInput',
  providerProfileInput: 'providerProfileInput',
  consumerProfileInput: 'consumerProfileInput',
  profileCreated: 'profileCreated',

  routesOverview: 'routesOverview',
} as const

export const ROUTES: Record<keyof typeof ROUTE_KEYS, string> = {
  // Main
  [ROUTE_KEYS.home]: '/',
  [ROUTE_KEYS.contact]: '/contact',
  [ROUTE_KEYS.categories]: '/categories',
  [ROUTE_KEYS.providerCategories]: '/provider-categories',
  [ROUTE_KEYS.providers]: '/providers',
  [ROUTE_KEYS.consumers]: '/consumers',
  [ROUTE_KEYS.organizations]: '/organizations',
  [ROUTE_KEYS.consumerProfile]: '/consumers/profile',
  [ROUTE_KEYS.providerProfileCreation]: '/providers/provider-profile-creation',
  [ROUTE_KEYS.providerProfile]: '/providers/profile',

  // Auth
  [ROUTE_KEYS.signOn]: '/auth/sign-on',
  [ROUTE_KEYS.logout]: '/auth/logout',
  [ROUTE_KEYS.auth]: '/auth',
  [ROUTE_KEYS.accountTypeSelection]: '/auth/account-type-selection',
  [ROUTE_KEYS.phoneNumberInput]: '/auth/phone-number-input',
  [ROUTE_KEYS.codeInput]: '/auth/code-input',
  [ROUTE_KEYS.providerProfileInput]: '/auth/provider-profile-input',
  [ROUTE_KEYS.consumerProfileInput]: '/auth/consumer-profile-input',
  [ROUTE_KEYS.profileCreated]: '/auth/profile-created',

  // Temporary
  [ROUTE_KEYS.routesOverview]: '/routes-overview',
} as const

export const ROUTE_KEYS_BY_VALUES = Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [v, k])) as Record<
  (typeof ROUTES)[keyof typeof ROUTES],
  keyof typeof ROUTES
>
