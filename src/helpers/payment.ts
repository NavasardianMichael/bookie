import { PaymentInfo, PaymentMethod } from '@interfaces/settings'
import { PAYMENT_METHODS } from '@constants/settings'

/** Leftover keys from earlier `paymentInfo` shapes. */
type LegacyPaymentInfo = {
  method?: PaymentMethod
  reference?: string
  cardNumber?: string
  accountNumber?: string
}

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  PAYMENT_METHODS.includes(value as PaymentMethod)

const asTrimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

const joinPayTo = (...values: unknown[]): string | undefined => {
  const parts = values.map(asTrimmed).filter((part): part is string => part !== undefined)
  return parts.length ? parts.join(' / ') : undefined
}

/**
 * The accepted methods of a profile, normalised.
 *
 * `paymentInfo` is an opaque `Json?` column, so three shapes reach us: the current
 * `{ methods: [...] }`, the pre-migration `{ method: '…' }` still sitting in a
 * `Provider.draft` overlay written before the reshape, and `null`. Reading the column
 * directly anywhere else re-opens that; go through here.
 */
export const toPaymentMethods = (info?: PaymentInfo | null): PaymentMethod[] => {
  if (!info) return []

  const { methods } = info
  if (Array.isArray(methods)) return methods.filter(isPaymentMethod)

  const { method } = info as LegacyPaymentInfo
  return isPaymentMethod(method) ? [method] : []
}

export type PaymentShare = {
  payToNumber?: string
  notes?: string
}

/**
 * Copyable pay-to details a provider publishes. Split `cardNumber` / `accountNumber`
 * and a leftover `reference` still read as one number so an unsaved draft shows
 * what they typed.
 */
export const toPaymentShare = (info?: PaymentInfo | null): PaymentShare => {
  if (!info) return {}

  const leftover = info as LegacyPaymentInfo
  return {
    payToNumber:
      asTrimmed(info.payToNumber) ?? joinPayTo(leftover.cardNumber, leftover.accountNumber) ?? asTrimmed(leftover.reference),
    notes: asTrimmed(info.notes),
  }
}

export const hasPaymentShare = (share: PaymentShare): boolean => Boolean(share.payToNumber || share.notes)

export const acceptsBankTransfer = (info?: PaymentInfo | null): boolean =>
  toPaymentMethods(info).includes('bank_transfer')

/**
 * True when a pay-to number is present *and* differs from what is already saved,
 * and bank transfer is selected — that field is not public otherwise.
 * Also true when bank transfer is newly selected while a number is already filled.
 */
export const needsPublicShareConfirm = (saved: PaymentInfo | null | undefined, next: PaymentInfo): boolean => {
  if (!acceptsBankTransfer(next)) return false

  const previous = toPaymentShare(saved)
  const upcoming = toPaymentShare(next)
  const hasPublicNumber = Boolean(upcoming.payToNumber)
  if (hasPublicNumber && !acceptsBankTransfer(saved)) return true

  const numberChanged = (upcoming.payToNumber ?? '') !== (previous.payToNumber ?? '')
  return Boolean(upcoming.payToNumber && numberChanged)
}
