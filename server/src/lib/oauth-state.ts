import type { Request } from 'express'
import jwt from 'jsonwebtoken'
import { timingSafeEqual } from 'node:crypto'
import { mintUrlToken } from './token.js'
import { config } from '../config.js'

/**
 * A cookie-backed `state` store for `passport-oauth2`.
 *
 * **Why this exists.** Passport's own state stores (`SessionStore`, `NonceStore`,
 * `PKCEStateStore`) all persist the nonce in `req.session`, i.e. they require
 * `express-session`. This server has no session store by design — identity is a stateless
 * JWT cookie (`lib/session.ts`) and there is no Redis. Passport's answer to that is
 * `options.store`: pass an object and it is used verbatim, which is what this is.
 *
 * Without it the only remaining option is `NullStore`, which is what the reference
 * implementation this replaces ends up using — **no state nonce and no PKCE at all**,
 * leaving the callback willing to accept any attacker-supplied `code` (OAuth login CSRF).
 * A ten-minute signed cookie is a smaller price than an entire stateful subsystem.
 *
 * **What the cookie carries.** The nonce, the PKCE verifier passport generated, and the
 * application context for this flow (which role is registering, where to return, whether
 * this is a sign-in or an account link). Signing it means `role` cannot be edited by the
 * browser, and keeping it in a cookie rather than the `state` query parameter means it
 * never passes through Google's servers, the browser's history, or a `Referer` header.
 *
 * **Why the cookie is what binds the flow.** A signature only proves *we* minted the
 * value, not that *this browser* started the flow — an attacker can obtain a validly
 * signed state and stitch it onto a victim's callback. Comparing the returned `state`
 * against a nonce held in the victim's own cookie is what closes that.
 */

/** Application context for an in-flight flow, chosen at initiate time. */
export type OAuthFlowContext = {
  intent: 'signin' | 'link'
  /**
   * Chosen on the registration page. Null when the flow started from sign-in — then the
   * completion step asks, rather than guessing a role for a new account.
   */
  role: 'consumer' | 'provider' | null
  /** Already checked by `isAllowedPublicReturnPath` at initiate time. */
  returnPath: string | null
  /**
   * For `intent: 'link'`, pinned at initiate so a session swap mid-flow cannot retarget
   * the link at a different account.
   */
  userId: string | null
}

type OAuthFlowCookie = OAuthFlowContext & { nonce: string; verifier: string }

/** Scoped to the two routes that read it, so it is not attached to every API request. */
const COOKIE_PATH = '/identity/google'

const cookieOptions = () => ({
  httpOnly: true,
  // **Must be `lax`, not `strict`.** Google returns the user via a top-level GET
  // navigation, and `strict` withholds the cookie on it — every callback would then fail
  // with a state mismatch. Equally it must not be `none`: nothing here is a cross-site
  // subresource.
  sameSite: 'lax' as const,
  secure: config.nodeEnv === 'production',
  path: COOKIE_PATH,
})

const nonceMatches = (received: string, expected: string): boolean => {
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Implements passport-oauth2's state-store interface.
 *
 * **The parameter counts are load-bearing.** `passport-oauth2` dispatches on
 * `store.length` and `verify.length` (strategy.js: `var arity = this._stateStore.store.length`).
 * Five parameters on `store` is what makes passport hand over the PKCE `verifier`; four on
 * `verify` is what makes it pass `meta`. Dropping an unused parameter silently changes the
 * call shape and breaks PKCE — so none of them may be removed even where unused.
 */
export const oauthStateStore = {
  /**
   * Called on initiate. `state` is whatever was passed as `authenticate(..., { state })`;
   * we always pass an object, which is the documented way to route into a custom store
   * (a string `state` bypasses the store entirely).
   *
   * The nonce is returned as the second callback argument, and that value — and only that
   * value — becomes the `state` query parameter on the wire.
   */
  store(
    req: Request,
    verifier: string,
    state: unknown,
    _meta: unknown,
    callback: (err: Error | null, state?: string) => void
  ): void {
    const context = (state ?? {}) as Partial<OAuthFlowContext>
    const nonce = mintUrlToken()

    const payload: OAuthFlowCookie = {
      nonce,
      // Undefined when PKCE is disabled. Stored as-is; `verify` hands it straight back.
      verifier,
      intent: context.intent === 'link' ? 'link' : 'signin',
      role: context.role ?? null,
      returnPath: context.returnPath ?? null,
      userId: context.userId ?? null,
    }

    try {
      // Signed as a JWT for `exp`: a browser that ignores `maxAge` still cannot replay an
      // eleven-minute-old flow, and the signature is what stops `role` or `userId` being
      // edited by whoever holds the cookie.
      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: Math.floor(config.oauthFlowTtlMs / 1000),
      })
      req.res?.cookie(config.oauthCookieName, token, {
        ...cookieOptions(),
        maxAge: config.oauthFlowTtlMs,
      })
    } catch (error) {
      return callback(error as Error)
    }

    return callback(null, nonce)
  },

  /**
   * Called on callback. Clears the cookie **first and unconditionally** — the flow is
   * single-use, including on every failure path, so a replayed callback finds nothing.
   *
   * `callback(null, verifier)` is how passport receives the PKCE code verifier: it checks
   * `typeof ok == 'string'` and sets `code_verifier` from it. Returning `false` instead
   * makes passport `fail(..., 403)`.
   */
  verify(
    req: Request,
    state: string,
    _meta: unknown,
    callback: (err: Error | null, ok?: string | false, info?: { message: string }) => void
  ): void {
    const raw = req.cookies?.[config.oauthCookieName] as string | undefined
    req.res?.clearCookie(config.oauthCookieName, cookieOptions())

    if (!raw) return callback(null, false, { message: 'google_state_missing' })

    let payload: OAuthFlowCookie
    try {
      payload = jwt.verify(raw, config.jwtSecret) as OAuthFlowCookie
    } catch {
      // Expired or tampered with — indistinguishable to us, and the same answer either way.
      return callback(null, false, { message: 'google_state_missing' })
    }

    if (typeof state !== 'string' || !state || !nonceMatches(state, payload.nonce)) {
      return callback(null, false, { message: 'google_state_mismatch' })
    }

    req.oauthFlow = {
      intent: payload.intent,
      role: payload.role,
      returnPath: payload.returnPath,
      userId: payload.userId,
    }

    return callback(null, payload.verifier)
  },
}
