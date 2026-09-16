import { PhoneNumber } from '@interfaces/app'

export const generateFriendlyPhoneNumber = (
  phone: PhoneNumber,
  options?: { prefix?: string; delimiter?: string }
): string => {
  // `code: 0` is a guest booking typed as a bare number, with no country selected.
  if (!phone.code) return String(phone.number)
  return `${options?.prefix ?? ''}${phone.code}${options?.delimiter ?? ''}${phone.number}`
}

/**
 * Anonymous booking phone: digits only, no country picker. `code: 0` means
 * unspecified — the server stores it and display skips a `+0` prefix.
 */
export const toGuestPhoneNumber = (raw: string): PhoneNumber => ({
  code: 0,
  number: Number(raw.replace(/\D/g, '')),
})
