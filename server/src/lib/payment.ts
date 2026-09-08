/**
 * Payment methods, server side.
 *
 * Mirrors `src/interfaces/settings.ts` + `src/helpers/payment.ts` on the frontend.
 * Kept as a duplicate rather than shared because `server/` is its own package with no
 * import path into `src/` — the four values are also written into every locale
 * catalogue, so a change here is never a one-file change.
 */

export const PAYMENT_METHODS = ['cash', 'card_on_site', 'bank_transfer', 'other'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  PAYMENT_METHODS.includes(value as PaymentMethod)

/**
 * The accepted methods held in a `paymentInfo` JSON column.
 *
 * Tolerates the pre-migration `{ method: '…' }` shape: the migration reshapes stored
 * rows, but a `Provider.draft` overlay round-tripped by an older client can still
 * arrive singular.
 */
export function toPaymentMethods(paymentInfo: unknown): PaymentMethod[] {
  if (!paymentInfo || typeof paymentInfo !== 'object') return []

  const info = paymentInfo as { methods?: unknown; method?: unknown }
  if (Array.isArray(info.methods)) return info.methods.filter(isPaymentMethod)

  return isPaymentMethod(info.method) ? [info.method] : []
}
