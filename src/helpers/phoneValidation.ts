import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode, getExampleNumber, isValidPhoneNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/mobile/examples'

/**
 * The shape a number takes in `country`, as `+374 XX XXXXXX`: the dialling code, then the
 * country's own digit grouping with every digit masked.
 *
 * Built from libphonenumber's example mobile number, so it follows the real numbering plan
 * rather than a hand-kept table. Masked rather than shown as the example itself because an
 * example reads as a number to copy, while `XX XXXXXX` reads as how many digits to type —
 * and that the field wants no leading trunk `0` after the code.
 */
export const getPhoneNumberPattern = (country: CountryCode): string | undefined => {
  const example = getExampleNumber(country, examples)
  if (!example) return undefined

  const callingCode = `+${example.countryCallingCode}`
  return `${callingCode}${example.formatInternational().slice(callingCode.length).replace(/\d/g, 'X')}`
}

/** A national number typed after a country picker, checked against that country's plan. */
export const isValidNationalPhoneNumber = (country: CountryCode, nationalNumber: string): boolean => {
  try {
    return isValidPhoneNumber(`+${getCountryCallingCode(country)}${nationalNumber}`)
  } catch {
    return false
  }
}

/**
 * A country picker + national number → E.164 (`+37410222333`), the shape `Organization.phone`
 * is stored in. Built exactly as `isValidNationalPhoneNumber` checks it, so a number the
 * field accepted cannot be dropped here. `undefined` when it is not valid.
 */
export const toE164PhoneNumber = (country: CountryCode, nationalNumber: string): string | undefined => {
  const digits = nationalNumber.replace(/\D/g, '')
  return digits && isValidNationalPhoneNumber(country, digits)
    ? `+${getCountryCallingCode(country)}${digits}`
    : undefined
}
