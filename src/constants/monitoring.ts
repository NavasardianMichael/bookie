/**
 * Google Analytics 4 and Sentry. Both IDs are `NEXT_PUBLIC_`, so they are inlined into the
 * browser bundle at build time and public by construction. Empty — local dev, CI — turns the
 * feature off: no GA tag, no events, and a Sentry client that sends nothing.
 */
export const GA_MEASUREMENT_ID = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim()
export const SENTRY_DSN = (process.env.NEXT_PUBLIC_SENTRY_DSN ?? '').trim()
