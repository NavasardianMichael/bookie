/**
 * Every failure the app can describe to a person, as `classifyError` sorts them.
 *
 * The kind — not the server's message — picks the copy a visitor reads in production
 * (`Errors.kinds.<kind>` in every catalogue). The server's text is English-only and
 * written for developers as often as for people, so it is shown only as a developer
 * detail.
 */
export const ERROR_KINDS = [
  'offline',
  'network',
  'timeout',
  'unauthorized',
  'forbidden',
  'notFound',
  'conflict',
  'validation',
  'tooLarge',
  'rateLimited',
  'unavailable',
  'server',
  'staleBuild',
  'unknown',
] as const

export type ErrorKind = (typeof ERROR_KINDS)[number]

/**
 * Kinds where asking again can succeed without the visitor changing anything. A Retry
 * button offered on a validation error or a 404 is a button that can only fail the same
 * way twice. `staleBuild` is absent on purpose: its remedy is a reload, not a retry.
 */
export const RETRYABLE_ERROR_KINDS: ReadonlySet<ErrorKind> = new Set<ErrorKind>([
  'offline',
  'network',
  'timeout',
  'rateLimited',
  'unavailable',
  'server',
  'unknown',
])

/**
 * Development shows the original error — server message, status, request, stack — under
 * the friendly copy; production shows the friendly copy alone. Next inlines `NODE_ENV` at
 * build time, so this is a constant in both bundles, and `next start` of a production
 * build hides the details exactly as the deployed site does.
 */
export const SHOW_ERROR_DETAILS = process.env.NODE_ENV !== 'production'
