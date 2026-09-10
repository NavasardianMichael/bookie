import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { config } from '../config.js'
import { fail } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { type SessionPayload, verifySession } from '../lib/session.js'

const readToken = (req: Request): string | undefined => req.cookies?.[config.cookieName] as string | undefined

/**
 * The one place a cookie becomes a trusted identity.
 *
 * The JWT proves the cookie was minted by us; it cannot prove the account still wants it
 * honoured. `User.tokenVersion` is the database's veto — password reset, password change,
 * email change, "sign out everywhere" and account delete all bump it, stranding every
 * cookie carrying the old value. That costs one indexed primary-key read per
 * *authenticated* request, where there used to be none, and it is the whole price of having
 * any revocation at all with a stateless JWT and no session store.
 *
 * The cost is smaller than it looks: every route behind these guards already queries the
 * database in its own handler, so this is one extra round trip on a request that was never
 * read-free. A request with **no cookie** never reaches the database at all, so anonymous
 * public traffic — Explore, category and provider pages, guest bookings — pays nothing.
 *
 * `emailVerifiedAt` is checked here too. The row is already loaded so it is free, and it
 * means "an unverified account cannot sign in" holds for every authenticated request rather
 * than only for the one login route that remembered to check.
 */
const authenticate = async (req: Request): Promise<SessionPayload | null> => {
  const token = readToken(req)
  if (!token) return null

  const session = verifySession(token)
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tokenVersion: true, emailVerifiedAt: true },
  })

  if (!user) return null
  if (user.tokenVersion !== session.tokenVersion) return null
  if (!user.emailVerifiedAt) return null

  return session
}

/**
 * For a route mounted under `optionalAuth` that makes an **authorization** decision on
 * `req.session` rather than merely personalising a read.
 *
 * Exported because `POST /appointments` needs to tell two cases apart that `optionalAuth`
 * alone cannot: "no cookie" is a genuine guest and must fall through to the guest booking
 * path, while "a cookie that is no longer honoured" must be a 401 so the client
 * re-authenticates. Without that split a revoked session would silently land in the guest
 * branch and fail on missing guest details.
 */
export const hasSessionCookie = (req: Request): boolean => Boolean(readToken(req))

export const currentSession = (req: Request): Promise<SessionPayload | null> => authenticate(req)

/**
 * Mounted globally in `app.ts`.
 *
 * Its session is *acted on* by public routes — the unlisted-profile owner check in
 * `routes/providers.ts`, the booking rate-limit key, and `resolveConsumerId`, which books
 * an appointment as whoever it names. So it has to be a **verified** session, not merely a
 * well-formed JWT.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const session = await authenticate(req)
    if (session) req.session = session
  } catch (error) {
    // Express 5 forwards a rejected handler promise to the error middleware, so without
    // this catch a database blip would 500 every public page. Continuing anonymous is the
    // safe direction: the worst outcome is that an owner's unlisted profile 404s to them.
    console.error('[auth] optionalAuth session lookup failed', error)
  }
  next()
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await authenticate(req)
  // One message for "no cookie", "malformed cookie" and "revoked cookie". The client must
  // not be able to tell them apart — all three mean re-authenticate — and the axios layer
  // already redirects on any 401.
  if (!session) return fail(res, 'Unauthorized', 401, 401)
  req.session = session
  next()
}

/**
 * `requireAuth` is async now, so the old callback composition
 * (`requireAuth(req, res, () => { ...check role... })`) would let Express continue while
 * the row read was still in flight, running the role check against an unset `req.session`
 * — a silent authorization bypass. A factory over one shared authenticator removes the
 * possibility rather than relying on an `await` being remembered.
 */
const requireRole = (role: 'provider' | 'consumer', message: string): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await authenticate(req)
    if (!session) return fail(res, 'Unauthorized', 401, 401)
    if (session.role !== role) return fail(res, message, 403, 403)
    req.session = session
    next()
  }
}

export const requireProvider = requireRole('provider', 'Provider access required')
export const requireConsumer = requireRole('consumer', 'Consumer access required')
