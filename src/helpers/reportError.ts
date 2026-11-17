import * as Sentry from '@sentry/nextjs'

/**
 * The one place an error goes when it is recorded rather than (or as well as) shown.
 *
 * Every failure the UI deliberately keeps quiet about — a decorative badge, a prefill,
 * service-worker registration — still comes through here, so "silent" never means
 * "invisible to whoever is debugging it". It logs, and in the browser also sends to Sentry
 * (`src/instrumentation-client.ts`), tagged with `context`. On the server Sentry is never
 * initialised, so the capture there is a no-op — the same as in the browser while
 * `NEXT_PUBLIC_SENTRY_DSN` is unset.
 */
export const reportError = (error: unknown, context: string): void => {
  console.error(`[${context}]`, error)
  Sentry.captureException(error, { tags: { context } })
}
