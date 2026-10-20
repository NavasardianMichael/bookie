/**
 * Stable application codes for a billing request the client must react to rather than merely
 * display. Mirrored as `BILLING_ERROR_CODES` in `src/constants/billing.ts`.
 *
 * This module imports nothing, for the reason `lib/plan-errors.ts` gives:
 * `tests/unit/server/billingErrors.spec.ts` imports it beside the web constant it must equal.
 *
 * - `notConfigured` — no Paddle key, or no price for the plan or add-on asked for. The client
 *   falls back to the contact-form request it offered before checkout existed.
 * - `alreadySubscribed` — a checkout was asked for while a subscription is live. A second
 *   checkout would be a second subscription; changes go through `POST /billing/change-plan`
 *   and `POST /billing/addon` instead.
 * - `noSubscription` — a switch, an add-on change or the billing portal was asked for with
 *   nothing to act on.
 * - `addonIncluded` — an add-on the plan already grants. Never sold on top of it.
 * - `lastItem` — the change would leave the subscription empty, which Paddle refuses. Ending
 *   everything is a cancellation, made in the billing portal.
 * - `changeUnavailable` — Paddle will not change the subscription right now: a renewal is
 *   processing, another change is pending, a payment failed, or too many charges were made
 *   today. Retrying at once cannot help; later, or Manage billing, can.
 * - `activeSubscription` — deleting a provider profile that is still being billed. It must be
 *   cancelled first, or Paddle would go on charging for a page that no longer exists.
 */
export const BILLING_ERROR = {
  notConfigured: 4301,
  alreadySubscribed: 4302,
  noSubscription: 4303,
  addonIncluded: 4304,
  lastItem: 4305,
  changeUnavailable: 4306,
  activeSubscription: 4307,
} as const
