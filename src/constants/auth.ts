export const USER_TYPES = {
  provider: 'provider',
  consumer: 'consumer',
} as const

export const SIGN_ON_STEPS = {
  accountTypeSelection: 'accountTypeSelection',
  phoneNumberInput: 'phoneNumberInput',
  codeInput: 'codeInput',
  profileInput: 'profileInput',
  profileCreated: 'profileCreated',
} as const

export const NEXT_SIGN_ON_STEP_BY_CURRENT = {
  accountTypeSelection: SIGN_ON_STEPS.phoneNumberInput,
  phoneNumberInput: SIGN_ON_STEPS.codeInput,
  codeInput: SIGN_ON_STEPS.profileInput,
  profileInput: SIGN_ON_STEPS.profileCreated,
  profileCreated: null,
}

export const SIGN_ON_STEP_PATH = {
  [SIGN_ON_STEPS.accountTypeSelection]: '/auth/sign-on/account-type-selection',
  [SIGN_ON_STEPS.phoneNumberInput]: '/auth/sign-on/phone-number-input',
  [SIGN_ON_STEPS.codeInput]: '/auth/sign-on/code-input',
  [SIGN_ON_STEPS.profileInput]: '/auth/sign-on/profile-input',
  [SIGN_ON_STEPS.profileCreated]: '/auth/sign-on/profile-created',
}
