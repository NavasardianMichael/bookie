import { PhoneNumber } from '@interfaces/app'

export const generateFriendlyPhoneNumber = (phone: PhoneNumber, options?: { prefix?: string; delimiter?: string }) => {
  return `${options?.prefix ?? ''}${phone.code}${options?.delimiter ?? ''}${phone.number}`
}
