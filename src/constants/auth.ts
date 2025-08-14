export const USER_TYPES = {
  provider: 'provider',
  consumer: 'consumer',
} as const

export const SIGN_ON_STEPS = {
  accountTypeSelection: 'accountTypeSelection',
  phoneNumberInput: 'phoneNumberInput',
  codeInput: 'codeInput',
  providerProfileInput: 'providerProfileInput',
  consumerProfileInput: 'consumerProfileInput',
  profileCreated: 'profileCreated',
} as const
