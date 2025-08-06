import { CountryCode } from 'libphonenumber-js'

type Form = {
  number: string
  code: CountryCode | undefined
}

export const REGISTRATION_FORM_INITIAL_VALUES: Form = {
  number: '',
  code: undefined,
}
