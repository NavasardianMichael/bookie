import passport from 'passport'
import { type Profile,Strategy as GoogleStrategy } from 'passport-google-oauth20'
import type { StateStore } from 'passport-oauth2'
import { oauthStateStore } from './oauth-state.js'
import { isEmail, MAX_EMAIL_LENGTH } from './request.js'
import { config, isGoogleOAuthConfigured } from '../config.js'

/**
 * Google sign-in, on `passport-google-oauth20` — the same library the sibling project uses,
 * with its two missing defences added:
 *
 * 1. **A `state` nonce and PKCE.** Passport's built-in state stores all need
 *    `express-session`, which this server does not have, so the reference implementation
 *    falls through to `NullStore` — no nonce, no PKCE, and a callback that will accept any
 *    attacker-supplied `code`. `lib/oauth-state.ts` is a cookie-backed store that restores
 *    both without a session store.
 * 2. **`email_verified` is checked.** Linking an account on an address Google has *not*
 *    confirmed is the primitive every OAuth account-takeover needs.
 *
 * **No ID token is involved, deliberately.** Passport fetches the profile from Google's
 * userinfo endpoint server-to-server, authenticated with an access token this server
 * obtained itself using the client secret over TLS. The response is therefore already
 * scoped to us, which is what the `aud` claim proves for an ID token — so there is no token
 * to verify, no JWKS to cache, and no OIDC `nonce` to echo.
 *
 * **If that ever changes, this reasoning does not survive it.** Google One Tap posts a
 * `credential` ID token straight from the browser; an ID token arriving over *that* channel
 * is untrusted, and accepting one would require full signature verification against
 * Google's JWKS plus explicit `aud`/`iss`/`exp`/`nonce` checks. Do not reuse this module's
 * "no verification needed" argument for it.
 */

/** A Google identity we are willing to act on. Only built after `email_verified` passes. */
export type GoogleIdentity = {
  /** Google's `sub`. **The account key** — never the email, which users can change. */
  googleId: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
}

export const GOOGLE_STRATEGY = 'google'

/** Errors the callback route turns into a `?error=` param on a redirect back to the web app. */
export const GOOGLE_ERROR = {
  unavailable: 'google_unavailable',
  denied: 'google_denied',
  stateMissing: 'google_state_missing',
  stateMismatch: 'google_state_mismatch',
  exchangeFailed: 'google_exchange_failed',
  emailUnverified: 'google_email_unverified',
  accountExists: 'google_account_exists',
  accountMismatch: 'google_account_mismatch',
  alreadyLinked: 'google_already_linked',
  unauthorized: 'google_unauthorized',
} as const

/**
 * Google reports `email_verified` as a boolean, but has been observed sending the string
 * `"true"`. Compared explicitly against both rather than coerced, so a truthy `"false"`
 * cannot slip through.
 */
const isVerifiedFlag = (value: unknown): boolean => value === true || value === 'true'

/**
 * Splits Google's display name when it does not give the parts separately. Names are
 * mandatory on both profile tables, so something has to be there; the email's local part is
 * the last resort rather than a server placeholder like "New Provider".
 */
const splitName = (profile: Profile, email: string): { firstName: string; lastName: string } => {
  const given = profile.name?.givenName?.trim()
  const family = profile.name?.familyName?.trim()
  if (given) return { firstName: given, lastName: family || '' }

  const display = profile.displayName?.trim()
  if (display) {
    const [first, ...rest] = display.split(/\s+/)
    return { firstName: first ?? '', lastName: rest.join(' ') }
  }

  return { firstName: email.split('@')[0] ?? 'Bookie', lastName: '' }
}

/**
 * Turns a Google profile into a `GoogleIdentity`, or rejects it.
 *
 * Exported so `tests/unit/server/` can cover the `email_verified` gate — the single most
 * important check in this file — without standing up an OAuth flow.
 */
export const readGoogleProfile = (profile: Profile): GoogleIdentity | null => {
  const googleId = profile.id?.trim()
  if (!googleId) return null

  const primary = profile.emails?.[0]
  const email = primary?.value?.trim().toLowerCase()
  if (!email || email.length > MAX_EMAIL_LENGTH || !isEmail(email)) return null

  // The gate. `profile.emails[0].verified` is Google's `email_verified`, mapped by
  // passport's openid profile parser. A Workspace admin can provision an account with an
  // unconfirmed address, so without this an attacker could assert an address they do not
  // control and have it linked to — or claim — the real owner's account.
  if (!isVerifiedFlag(primary?.verified) && !isVerifiedFlag(profile._json?.email_verified)) {
    return null
  }

  const avatarUrl = profile.photos?.[0]?.value?.trim()
  return { googleId, email, ...splitName(profile, email), avatarUrl: avatarUrl || undefined }
}

let registered = false

/**
 * Registers the strategy once, lazily.
 *
 * Lazy because a fresh clone ships blank Google credentials: constructing the strategy at
 * module scope would either throw at import or build a client that silently produces a
 * broken authorization URL. `isGoogleOAuthConfigured()` is what the routes and `/health`
 * check first.
 */
export const ensureGoogleStrategy = (): boolean => {
  if (!isGoogleOAuthConfigured()) return false
  if (registered) return true

  passport.use(
    GOOGLE_STRATEGY,
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.redirectUri,
        scope: ['profile', 'email'],
        /**
         * Restores the state nonce and PKCE without `express-session`. Passing an object
         * (rather than `state: true`) is what makes passport use it verbatim.
         *
         * The cast is deliberate and narrow: `@types/passport-oauth2`'s `StateStore` is
         * **incomplete relative to the runtime**. It declares only the 2- and 3-parameter
         * `store` overloads and types the verify callback's `ok` as `boolean`, but
         * `strategy.js` dispatches on `store.length` and calls the 5-parameter form
         * `store(req, verifier, state, meta, cb)` when PKCE is on, then reads a *string*
         * verifier back out of `verify`'s callback (`if (typeof ok == 'string')`).
         * `lib/oauth-state.ts` implements the real contract, which the published types
         * cannot describe.
         */
        store: oauthStateStore as unknown as StateStore,
        pkce: true,
      },
      /**
       * Deliberately thin: validate the profile and hand it on. Account resolution needs
       * the flow context that `oauthStateStore.verify` put on the request, and it decides
       * redirects — both of which belong in the route, not in a strategy callback.
       *
       * The tokens are ignored. We do not act on the user's behalf at Google, so storing a
       * refresh token would be holding a credential with no purpose.
       */
      (_accessToken, _refreshToken, profile, done) => {
        const identity = readGoogleProfile(profile)
        if (!identity) {
          // No `profile` in the log line: it carries the user's name, email and photo URL,
          // and `server/CLAUDE.md`'s logging rule applies to PII, not only to secrets.
          return done(null, false, { message: GOOGLE_ERROR.emailUnverified })
        }
        return done(null, identity)
      }
    )
  )

  registered = true
  return true
}

/** `passport.initialize()` only — no `passport.session()`, since there is no session store. */
export const passportInitialize = () => passport.initialize()

/**
 * Re-exported from the package rather than through a local `export { passport }`, so the
 * export is declared where it is public (eslint `no-restricted-syntax`). Same singleton
 * the `passport.use(...)` calls above configure.
 */
export { default as passport } from 'passport'
