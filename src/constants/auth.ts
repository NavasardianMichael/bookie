import { ROUTES } from './routes'

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

export const SIGN_ON_STEP_PATH = {
  [SIGN_ON_STEPS.accountTypeSelection]: ROUTES.accountTypeSelection,
  [SIGN_ON_STEPS.phoneNumberInput]: ROUTES.phoneNumberInput,
  [SIGN_ON_STEPS.codeInput]: ROUTES.codeInput,
  [SIGN_ON_STEPS.providerProfileInput]: ROUTES.providerProfileInput,
  [SIGN_ON_STEPS.consumerProfileInput]: ROUTES.consumerProfileInput,
  [SIGN_ON_STEPS.profileCreated]: ROUTES.profileCreated,
}
