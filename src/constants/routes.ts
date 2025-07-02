export const ROUTES = {
  // Main
  home: '/',
  contact: '/contact',
  providerCategories: '/provider-categories',
  providers: '/providers',
  consumers: '/consumers',
  consumerProfile: '/consumers/profile',
  providerProfile: '/providers/profile',

  // Auth
  signOn: '/auth/sign-on',
  logout: '/auth/logout',
  auth: '/auth',
  accountTypeSelection: '/auth/account-type-selection',
  phoneNumberInput: '/auth/phone-number-input',
  codeInput: '/auth/code-input',
  providerProfileInput: '/auth/provider-profile-input',
  consumerProfileInput: '/auth/consumer-profile-input',
  profileCreated: '/auth/profile-created',

  // Temporary
  routesOverview: '/routes-overview',
} as const
