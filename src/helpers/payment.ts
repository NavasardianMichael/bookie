import { PaymentInfo, PaymentMethod } from '@interfaces/settings'
import { PAYMENT_METHODS } from '@constants/settings'

/** The pre-migration shape: one preferred method rather than a set of accepted ones. */
type LegacyPaymentInfo = { method?: PaymentMethod }

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  PAYMENT_METHODS.includes(value as PaymentMethod)

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
