export const USER_TYPES = {
  provider: 'provider',
  consumer: 'consumer',
} as const

/**
 * The sign-on funnel's steps, one per route that actually exists. Registration is
 * role-specific — a consumer and a provider fill different forms — so the middle step
 * differs by role, then both rejoin at the OTP.
 */
export const SIGN_ON_STEPS = {
  accountTypeSelection: 'accountTypeSelection',
  consumerRegistration: 'consumerRegistration',
  providerRegistration: 'providerRegistration',
  phoneNumberInput: 'phoneNumberInput',
  codeInput: 'codeInput',
  profileCreated: 'profileCreated',
} as const
