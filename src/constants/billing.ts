/**
 * Stable codes from the API's `BILLING_ERROR` (`server/src/lib/billing-errors.ts`), pinned by
 * `tests/unit/server/billingErrors.spec.ts`. Their copy is `Errors.codes.*`.
 */
export const BILLING_ERROR_CODES = {
  notConfigured: 4301,
  alreadySubscribed: 4302,
  noSubscription: 4303,
} as const

/** A Paddle subscription's status, as `GET /provider-profile/plan` reports it. */
export const BILLING_STATUSES = {
  active: 'active',
  trialing: 'trialing',
  pastDue: 'past_due',
  paused: 'paused',
  canceled: 'canceled',
} as const

/**
 * Paddle.js credentials. The client-side token is **public by design** — it can only open a
 * checkout for a transaction our API created — and `NEXT_PUBLIC_` inlines it into the bundle.
 * The environment must agree with the API's `PADDLE_SANDBOX`, or the overlay looks for the
 * transaction in the other Paddle account. See docs/PADDLE_SETUP.md.
 */
export const PADDLE_CLIENT_TOKEN = (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '').trim()
export const PADDLE_ENVIRONMENT: 'sandbox' | 'production' =
  process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production'

/** Appended by Paddle to the checkout URL; Paddle.js opens the overlay when it sees it. */
export const PADDLE_TRANSACTION_QUERY = '_ptxn'

/**
 * The plan being bought, carried from the Upgrade button through Paddle's checkout to the
 * return page, which waits until it is the plan in force. Added to the checkout URL by the
 * client — Paddle never reads it.
 */
export const CHECKOUT_PLAN_QUERY = 'plan'

/** How the return page and a plan switch wait for the webhook: every 2 s, for up to a minute. */
export const AWAIT_PLAN_POLL_MS = 2000
export const AWAIT_PLAN_TIMEOUT_MS = 60_000
