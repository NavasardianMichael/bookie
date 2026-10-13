import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js'
import { PhoneNumber } from '@interfaces/app'
import {
  CategoryChoicePayload,
  CategoryValue,
  NewOrganizationFormValues,
  NewOrganizationPayload,
  OrganizationValue,
  RegistrationProfile,
} from '@interfaces/auth'
import { GOOGLE_SIGN_UP_QUERY } from '@constants/auth'
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

/**
 * What the settings profile's Organization section should write, or `undefined` when it is
 * unchanged. `fields` is `toOrganizationFields`' output after the similar-name check, so
 * neither key means the section is closed — detached, or never opened — and an existing
 * link is then removed with `organizationId: null`.
 */
export const organizationChangeToSave = (
  currentId: string | undefined,
  fields: Pick<RegistrationProfile, 'organizationId' | 'newOrganization'>
): { organizationId: string | null } | { newOrganization: NewOrganizationPayload } | undefined => {
  if (fields.newOrganization) return { newOrganization: fields.newOrganization }
  const nextId = fields.organizationId ?? null
  if (nextId === (currentId ?? null)) return undefined
  return { organizationId: nextId }
}

/**
 * Whether a registration page (or the account-type choice) was opened by the API's Google
 * callback for a first-time account — `?google=1`, see `GOOGLE_SIGN_UP_QUERY`. Takes a page's
 * awaited `searchParams`, where a repeated key arrives as an array.
 */
export const isGoogleSignUp = (params: Record<string, string | string[] | undefined>): boolean => {
  const value = params[GOOGLE_SIGN_UP_QUERY]
  return (Array.isArray(value) ? value[0] : value) === '1'
}

/**
 * The provider Categories field as the API takes it: a picked category by `id`, a new one by
 * its name — trimmed, inner whitespace collapsed, as the server stores it. Entries that are
 * neither are dropped; the field never holds one, but a stale value must not send `{}`.
 */
export const toCategoryChoices = (values: readonly CategoryValue[] | undefined): CategoryChoicePayload[] =>
  (values ?? []).flatMap((value): CategoryChoicePayload[] => {
    if (value.id) return [{ id: value.id }]
    const name = collapseWhitespace(value.name ?? '')
    return value.isNew && name ? [{ name }] : []
  })

/** A provider's saved categories as the Categories field holds them, for a form that edits them. */
export const toCategoryValues = (categories: readonly { id: string; name: string }[] | undefined): CategoryValue[] =>
  (categories ?? []).map(({ id, name }) => ({ id, name }))

/**
 * What the settings Categories field should write — the whole list, which replaces the saved
 * one — or `undefined` when it is unchanged: the same ids, in any order, and nothing new.
 */
export const categoriesChangeToSave = (
  current: readonly { id: string }[] | undefined,
  next: readonly CategoryChoicePayload[]
): CategoryChoicePayload[] | undefined => {
  const saved = new Set((current ?? []).map((category) => category.id))
  const unchanged =
    next.length === saved.size && next.every((choice) => 'id' in choice && saved.has(choice.id))
  return unchanged ? undefined : [...next]
}
