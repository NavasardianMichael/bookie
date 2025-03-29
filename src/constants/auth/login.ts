
export const LOGIN_FORM_INITIAL_VALUES = {
  email: '',
  password: '',
  rememberMe: false,
} as const

export const LOGIN_TYPES = {
  internal: 'internal',
  google: 'google',
  telegram: 'telegram',
  webTelegram: 'webTelegram'
} as const
