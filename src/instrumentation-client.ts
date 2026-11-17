import * as Sentry from '@sentry/nextjs'
import { SENTRY_DSN } from '@constants/monitoring'

/**
 * Browser error reporting — and only the browser: there is no `instrumentation.ts`, so
 * neither Next's server nor the Express API runs Sentry. Runs before hydration.
 *
 * Errors only — no tracing, no session replay. Besides what `reportError` sends, the SDK
 * catches uncaught errors and unhandled rejections on its own; its Dedupe integration drops
 * the second copy when `UnhandledErrorListener` reports the same one.
 *
 * By SDK 11.13 `dataCollection` has replaced `sendDefaultPii` (crossword's 11.9 still has it) and defaults to collecting
 * everything, so each category is switched off here: no user, cookies, headers, bodies or
 * query strings (`?_ptxn=` names a Paddle transaction).
 */
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  environment: process.env.NODE_ENV,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
