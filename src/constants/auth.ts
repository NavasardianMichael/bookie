export const USER_TYPES = {
  provider: 'provider',
  consumer: 'consumer',
} as const

/**
 * The sign-on funnel's steps, one per route that actually exists.
 *
 * Registration stays role-specific — a consumer and a provider fill different forms — but
 * the two no longer rejoin at an OTP screen. Creating an account does **not** sign anyone
 * in: `POST /identity/register` mails a verification link, and the funnel continues from
 * the recipient's inbox, because an unverified account cannot hold a session.
 */
export const SIGN_ON_STEPS = {
  accountTypeSelection: 'accountTypeSelection',
  consumerRegistration: 'consumerRegistration',
  providerRegistration: 'providerRegistration',
  signIn: 'signIn',
  verifyEmail: 'verifyEmail',
  completeRegistration: 'completeRegistration',
} as const

/** Query param the email-verification link puts on the account profile URL. */
export const EMAIL_VERIFY_QUERY = 'verifyEmail'

/**
 * Query param carrying the one-time token on the links this app mails — signup
 * verification and password reset both read it.
 */
export const TOKEN_QUERY = 'token'

/**
 * Query param the API's Google callback uses to report a failure. Values are the server's
 * `GOOGLE_ERROR` codes; the copy for each lives in the `Auth.googleErrors` namespace so it
 * is translated here rather than on the server.
 */
export const AUTH_ERROR_QUERY = 'error'

/**
 * Stable application codes from the API's `AUTH_ERROR`, mirrored so the client can *react*
 * rather than string-match an error message. The envelope's `code` carries these instead of
 * the HTTP status on `/identity/*` only — every other route puts the status there.
 */
export const AUTH_ERROR_CODES = {
  invalidCredentials: 4001,
  emailUnverified: 4002,
  passwordPolicy: 4003,
  invalidToken: 4004,
  expiredToken: 4005,
  googleOnlyAccount: 4006,
  reauthRequired: 4007,
  emailTaken: 4008,
  hasAppointments: 4009,
} as const

/** Mirrors `GOOGLE_ERROR` in `server/src/lib/google-oauth.ts`. */
export const GOOGLE_ERROR_CODES = [
  'google_unavailable',
  'google_denied',
  'google_state_missing',
  'google_state_mismatch',
  'google_exchange_failed',
  'google_email_unverified',
  'google_account_exists',
  'google_account_mismatch',
  'google_already_linked',
  'google_unauthorized',
] as const

export type GoogleErrorCode = (typeof GOOGLE_ERROR_CODES)[number]

/** Matches `PASSWORD_POLICY` in `server/src/lib/password.ts`. */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
