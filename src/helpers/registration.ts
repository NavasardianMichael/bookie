import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode } from 'libphonenumber-js'
import { PhoneNumber } from '@interfaces/app'
import { OrganizationValue, RegistrationProfile } from '@interfaces/auth'

/**
 * Country code + national number as the API wants them: two numbers, not a formatted string.
 *
 * `getCountryCallingCode` returns the dialling code as a string ('374'), and the server
 * reads `phone.number` with `BigInt`, so both sides must be numeric.
 */
export const toPhoneNumber = (country: CountryCode, nationalNumber: string): PhoneNumber => ({
  code: Number(getCountryCallingCode(country)),
  number: Number(nationalNumber),
})

/**
 * Splits the Organization combobox value into the two fields the API distinguishes.
 *
 * An `id` means an existing organization was picked, so the name is redundant and dropped —
 * sending both would let a stale label rename nothing but confuse the payload. Bare text is
 * sent as `organizationName` for the server to match case-insensitively or create. Blank
 * text yields neither field, which is how a provider registers with no organization at all.
 */
export const toOrganizationFields = (
  value: OrganizationValue | undefined
): Pick<RegistrationProfile, 'organizationId' | 'organizationName'> => {
  if (value?.id) return { organizationId: value.id }

  const name = value?.name?.trim()
  return name ? { organizationName: name } : {}
}

/** Drops empty optional strings so the API receives `undefined` rather than `''`. */
export const toOptionalText = (value: string | undefined): string | undefined => value?.trim() || undefined
