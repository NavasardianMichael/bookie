import type { Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export type SessionPayload = {
  userId: string
  role: 'consumer' | 'provider'
  profileId: string
  /**
   * The `User.tokenVersion` this cookie was minted against.
   *
   * `middleware/auth.ts` refuses the cookie when the row has moved on, which is the only
   * thing that makes a stateless 7-day JWT revocable without a session store. Bumped by
   * password reset, password change, email change, "sign out everywhere", the Google claim
   * of an unverified account, and account delete — **not** by ordinary logout, since
   * signing out on a laptop must not sign out a phone.
   *
   * Every caller of `setSessionCookie` therefore has to supply the user's current version;
   * they all have the row in hand at that point.
   */
  tokenVersion: number
}

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}

/**
 * `jwt.verify` returns `string | JwtPayload`, so the shape has to be checked rather than
 * asserted.
 *
 * The previous version cast the result directly, which meant a cookie minted by an earlier
 * build — before `tokenVersion` existed — deserialised it as `undefined` and then compared
 * unequal to `0` by accident rather than by decision. Checking explicitly makes that a
 * deliberate rejection: every pre-migration session is invalidated on deploy, which is
 * correct, because the auth model changed and no existing account has a password yet.
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    if (typeof decoded !== 'object' || decoded === null) return null

    const { userId, role, profileId, tokenVersion } = decoded as Partial<SessionPayload>
    if (typeof userId !== 'string' || typeof profileId !== 'string') return null
    if (role !== 'consumer' && role !== 'provider') return null
    if (typeof tokenVersion !== 'number') return null

    return { userId, role, profileId, tokenVersion }
  } catch {
    return null
  }
}

/**
 * The attributes are shared with `clearSessionCookie` on purpose — see the note there.
 */
const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.nodeEnv === 'production',
  path: '/',
})

export function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = signSession(payload)
  res.cookie(config.cookieName, token, {
    ...sessionCookieOptions(),
    maxAge: COOKIE_MAX_AGE_MS,
  })
}

/**
 * Clearing must repeat the attributes the cookie was **set** with.
 *
 * A bare `res.clearCookie(name)` emits a `Set-Cookie` with no `Path`/`SameSite`/`Secure`,
 * and a browser only overwrites a cookie whose name, path and domain all match — so in
 * Chrome the original could survive its own logout. This is why the options are factored
 * out rather than written twice.
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie(config.cookieName, sessionCookieOptions())
}
