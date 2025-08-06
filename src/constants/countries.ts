import { CountryCode } from 'libphonenumber-js'

export const SIGN_ON_EXCLUDED_COUNTRIES: Partial<Record<CountryCode, boolean>> = {
  // Missing flag
  AC: true,
}
