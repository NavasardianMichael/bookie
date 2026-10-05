/**
 * Stable application codes for a billing request the client must react to rather than merely
 * display. Mirrored as `BILLING_ERROR_CODES` in `src/constants/billing.ts`.
 *
 * This module imports nothing, for the reason `lib/plan-errors.ts` gives:
 * `tests/unit/server/billingErrors.spec.ts` imports it beside the web constant it must equal.
 *
 * - `notConfigured` — no Paddle key, or no price for the plan asked for. The client falls back
 *   to the contact-form request it offered before checkout existed.
 * - `alreadySubscribed` — a checkout was asked for while a subscription is live. A second
 *   checkout would be a second subscription; switching plans is `POST /billing/change-plan`.
 * - `noSubscription` — a switch or the billing portal was asked for with nothing to act on.
 */
export const BILLING_ERROR = {
  notConfigured: 4301,
  alreadySubscribed: 4302,
  noSubscription: 4303,
} as const
