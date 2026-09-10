import path from 'node:path'
import { fileURLToPath } from 'node:url'

import './load-env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  port: Number(process.env.PORT ?? 4142),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4141',
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, '../uploads')),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  cookieName: 'bookie_session',
  /** Cookie holding an in-flight Google OAuth flow. Scoped to `/identity/google`. */
  oauthCookieName: 'bookie_oauth',
  /** Cookie holding a verified Google identity awaiting its phone number. */
  oauthPendingCookieName: 'bookie_oauth_pending',
  /** Email-verification links last a day — they are clicked from an inbox, not typed in. */
  emailVerifyTtlMs: 24 * 60 * 60 * 1000,
  /**
   * A password-reset link is a full credential, so it lives far shorter than the
   * verification link above.
   */
  passwordResetTtlMs: 60 * 60 * 1000,
  /** An OAuth round trip through Google, generously. Both OAuth cookies expire with it. */
  oauthFlowTtlMs: 10 * 60 * 1000,
  /** Long enough to fill in a phone number after Google returns, short enough to matter. */
  oauthPendingTtlMs: 15 * 60 * 1000,
  /**
   * External mail engine. Read only by `lib/mail.ts` — nothing else may touch `apiKey`.
   *
   * An empty `apiUrl` or `apiKey` disables sending rather than throwing, which is what
   * `.env.example` ships: local dev has no key, so the contact form still stores its
   * message and the verification link still prints to this console.
   */
  mail: {
    apiUrl: (process.env.MAIL_API_URL ?? '').replace(/\/+$/, ''),
    apiKey: process.env.MAIL_API_KEY ?? '',
    /** Identifies this app to the engine; must match the id registered there. */
    appId: process.env.MAIL_APP_ID ?? 'bookie',
  },
  /**
   * Google OAuth. `clientSecret` is read **only** by `lib/google-oauth.ts` — nothing else
   * may touch it, and it is never returned, logged, or put in an error, exactly as
   * `mail.apiKey` is treated. `clientId` is not a secret (it appears in the authorization
   * URL) but lives beside it.
   *
   * Empty values disable the flow rather than throwing — the same bargain `mail` makes, so
   * a fresh clone starts and the Google button is simply unavailable.
   *
   * `redirectUri` points at the **API**, not the web app: the session cookie is host-only
   * on the API origin, so the callback has to land there to be able to set it.
   */
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4142/identity/google/callback',
  },
}

/**
 * Whether Google sign-in can be offered at all. Lives here rather than in
 * `lib/google-oauth.ts` so `app.ts` can report it on `/health` without importing the OAuth
 * client — the web app needs the answer to decide whether to render the button.
 */
export const isGoogleOAuthConfigured = (): boolean =>
  Boolean(config.google.clientId && config.google.clientSecret && config.google.redirectUri)
