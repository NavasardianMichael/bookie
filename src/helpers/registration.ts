import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js'
import { PhoneNumber } from '@interfaces/app'
import { NewOrganizationFormValues, OrganizationValue, RegistrationProfile } from '@interfaces/auth'
import { toE164PhoneNumber } from '@helpers/phoneValidation'
import { collapseWhitespace } from '@helpers/search'
import { toWebsiteUrl } from '@helpers/url'

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

/** Same as `toPhoneNumber`, but blank country/number yields `undefined` rather than `{0,0}`. */
export const toOptionalPhoneNumber = (
  country: CountryCode | undefined,
  nationalNumber: string | undefined
): PhoneNumber | undefined => {
  const digits = nationalNumber?.replace(/\D/g, '')
  if (!country || !digits) return undefined
  return toPhoneNumber(country, digits)
}

/**
 * Inverse of `toPhoneNumber`: the country Select needs an ISO code, not a dialling
 * code, so `+374…` has to be parsed rather than split on the first digits.
 */
export const toPhoneFormValues = (
  phone: PhoneNumber | string | undefined
): { code: CountryCode; number: string } | undefined => {
  if (!phone) return undefined
  const raw = typeof phone === 'string' ? phone : `+${phone.code}${phone.number}`
  const parsed = parsePhoneNumberFromString(raw)
  if (!parsed?.country) return undefined
  return { code: parsed.country, number: parsed.nationalNumber }
}

/** Drops empty optional strings so the API receives `undefined` rather than `''`. */
export const toOptionalText = (value: string | undefined): string | undefined => value?.trim() || undefined

/**
 * Splits the registration Organization field into the two shapes the API distinguishes.
 *
 * An `id` means an existing organization was picked, so the name and any new-organization
 * details are dropped — sending both would let a stale label rename nothing but confuse the
 * payload. `isNew` sends the name with its details, the phone as E.164 built from its own
 * country picker. One-line text is trimmed on both sides with inner runs of whitespace
 * collapsed ("  Acme   Dental " → "Acme Dental"); the server does the same. Anything else —
 * no section, or text never resolved into a pick — yields neither field, which is how a
 * provider registers with no organization at all.
 */
export const toOrganizationFields = (
  value: OrganizationValue | undefined,
  details: NewOrganizationFormValues | undefined
): Pick<RegistrationProfile, 'organizationId' | 'newOrganization'> => {
  if (value?.id) return { organizationId: value.id }

  const name = collapseWhitespace(value?.name ?? '')
  if (!value?.isNew || !name) return {}

  const phoneNumber = toOptionalText(details?.phoneNumber)
  const address = collapseWhitespace(details?.address ?? '')
  return {
    newOrganization: {
      name,
      description: toOptionalText(details?.description),
      address: address || undefined,
      phone: details?.phoneCode && phoneNumber ? toE164PhoneNumber(details.phoneCode, phoneNumber) : undefined,
      website: toWebsiteUrl(details?.website),
    },
  }
}
