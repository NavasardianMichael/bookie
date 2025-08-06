import { CountryCode } from 'libphonenumber-js'

export const EXCLUDED_COUNTRIES: Partial<Record<CountryCode, boolean>> = {
  AC: true,
}
