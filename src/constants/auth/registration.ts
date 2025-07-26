import { CountryCode } from 'libphonenumber-js'

type Form = {
  phoneNumber: string
  countryCode: CountryCode | undefined
}

export const REGISTRATION_FORM_INITIAL_VALUES: Form = {
  phoneNumber: '',
  countryCode: undefined,
}
