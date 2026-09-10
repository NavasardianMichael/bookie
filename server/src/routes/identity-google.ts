import { Prisma } from '@prisma/client'
import { type Request, type Response,Router } from 'express'
import jwt from 'jsonwebtoken'
import {
  asCountryCode,
  asPhone,
  AUTH_ERROR,
  issueSession,
  loadProfile,
  type RegistrationProfile,
  resolveOrganizationId,
} from './identity.js'
import { config } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import {
  ensureGoogleStrategy,
  GOOGLE_ERROR,
  GOOGLE_STRATEGY,
  type GoogleIdentity,
  passport,
  passportInitialize,
} from '../lib/google-oauth.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asBoundedString, asTrimmedString } from '../lib/request.js'
import { DEFAULT_VERIFY_LOCALE, isAllowedPublicReturnPath, splitLocalePath } from '../lib/return-path.js'
import { asyncHandler } from '../middleware/error.js'

/**
 * Google sign-in and account linking.
 *
 * Split from `routes/identity.ts` because it is the only part of the funnel that speaks in
 * **redirects rather than JSON**: every branch here ends as a top-level browser navigation
 * back to the web app, so the envelope those routes return would never be read. The two
 * JSON routes at the bottom (`/pending`, `/complete`) are the completion form's API and do
 * use it.
 *
 * **Import cycle, deliberate and contained.** `identity.ts` mounts this router, and this
 * module imports its helpers back — `issueSession`, `loadProfile`, `asPhone` and friends
 * are exported from there for exactly this consumer and have no other importer. Node hands
 * a partially-initialised namespace to the second module in a cycle, so **every one of
 * those bindings must be referenced inside a handler, never at module scope**: a
 * `const X = AUTH_ERROR.foo` at the top level here would be a boot-time ReferenceError.
 * Handlers run long after both modules finish evaluating, so live bindings resolve fine.
 */
export const googleRouter = Router()

/** No `passport.session()` — identity is a stateless JWT cookie, so there is no session. */
googleRouter.use(passportInitialize())

/** Scoped to this router, matching the flow cookie in `lib/oauth-state.ts`. */
const COOKIE_PATH = '/identity/google'

const pendingCookieOptions = () => ({
  httpOnly: true,
  // `lax` for the same reason as the flow cookie: it is set during Google's top-level
  // redirect back to us, and `strict` would withhold it from that navigation.
  sameSite: 'lax' as const,
  secure: config.nodeEnv === 'production',
  path: COOKIE_PATH,
})

/**
 * A Google identity that has been verified but has no account yet.
 *
 * `POST /identity/register` requires a phone number and a role, and Google supplies
 * neither — so a first-time Google user is parked here while the web app collects them.
 * Signed as a JWT for the same reason the flow cookie is: `exp` bounds the replay window,
 * and the signature is what stops `email` or `googleId` being edited by whoever holds it.
 * Nothing is written to the database until `/complete`, so an abandoned flow leaves no row.
 */
type PendingGoogleAccount = GoogleIdentity & { role: 'consumer' | 'provider' | null; locale: string }

const MAX_NAME_LENGTH = 40

const completeIpLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 })

/* ------------------------------------------------------------------ *
 * Redirects
 * ------------------------------------------------------------------ */

const webUrl = (path: string, params: Record<string, string> = {}): string => {
  const origin = config.corsOrigin.endsWith('/') ? config.corsOrigin : `${config.corsOrigin}/`
  const url = new URL(path.replace(/^\/+/, ''), origin)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

/**
 * The locale to answer in, taken from the return path the initiate step already validated.
 *
 * Derived rather than passed separately so there is only one request-supplied value to
 * guard — `isAllowedPublicReturnPath` has vetted the whole string by the time this runs.
 */
const localeOf = (returnPath: string | null): string =>
  (returnPath ? splitLocalePath(returnPath)?.locale : null) ?? DEFAULT_VERIFY_LOCALE

/**
 * Failures land back on the page the flow started from, carrying a stable `?error=` code.
 *
 * A code rather than a message: the web app has all 15 locales and we do not, so the copy
 * belongs there. `GOOGLE_ERROR` is the contract.
 */
const redirectWithError = (res: Response, returnPath: string | null, error: string): void => {
  const locale = localeOf(returnPath)
  res.redirect(webUrl(returnPath ?? `/${locale}/auth/sign-in`, { error }))
}

/* ================================================================== *
 * GET /identity/google — initiate
 * ================================================================== */

googleRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const returnPathRaw = asTrimmedString(req.query.returnPath)
    // Vetted here, once, so every later redirect in this flow is working from a string
    // that has already passed the open-redirect guard.
    const returnPath = returnPathRaw && isAllowedPublicReturnPath(returnPathRaw) ? returnPathRaw : null

    if (!ensureGoogleStrategy()) {
      return redirectWithError(res, returnPath, GOOGLE_ERROR.unavailable)
    }

    const intent = req.query.intent === 'link' ? 'link' : 'signin'
    const roleRaw = req.query.role
    const role = roleRaw === 'consumer' || roleRaw === 'provider' ? roleRaw : null

    /**
     * Linking needs a signed-in account, and the id is pinned into the flow cookie **now**
     * rather than read from the session on return: the callback arrives as a fresh
     * navigation, and a session swapped mid-flow would otherwise retarget the link at
     * whichever account happens to be signed in when Google answers.
     */
    if (intent === 'link' && !req.session) {
      return redirectWithError(res, returnPath, GOOGLE_ERROR.unauthorized)
    }

    /**
     * The double cast is the same published-types gap `lib/google-oauth.ts` documents for
     * `StateStore`, seen from the other side: `@types/passport-google-oauth20` declares
     * `state?: string`, but `passport-oauth2` passes a **non-string** `state` straight to
     * `store.store(...)` as its `state` argument (`strategy.js`: `if (typeof state == 'object')`).
     * An object is therefore the documented way into a custom store, and a string would
     * bypass `oauthStateStore` entirely — taking the nonce, PKCE and flow context with it.
     */
    const options = {
      session: false,
      // Consumed by `oauthStateStore.store`, which puts it in a signed cookie and sends
      // only its nonce to Google.
      state: { intent, role, returnPath, userId: intent === 'link' ? (req.session?.userId ?? null) : null },
      // Google returns a fresh profile every time; without this a user who wants to pick a
      // different account is silently signed in as the one Google already remembers.
      prompt: intent === 'link' ? 'consent' : 'select_account',
    } as unknown as Parameters<typeof passport.authenticate>[1]

    return passport.authenticate(GOOGLE_STRATEGY, options)(req, res, () => undefined)
  })
)

/* ================================================================== *
 * GET /identity/google/callback
 * ================================================================== */

/** Maps a passport failure to the `?error=` code the web app renders. */
const failureCode = (info: unknown): string => {
  const message = (info as { message?: string } | undefined)?.message
  const known = Object.values(GOOGLE_ERROR) as string[]
  return message && known.includes(message) ? message : GOOGLE_ERROR.exchangeFailed
}

googleRouter.get(
  '/callback',
  asyncHandler(async (req, res, next) => {
    if (!ensureGoogleStrategy()) {
      return redirectWithError(res, null, GOOGLE_ERROR.unavailable)
    }

    // Google's own refusal never reaches the strategy — it comes back as `?error=`.
    if (req.query.error) {
      return redirectWithError(res, null, GOOGLE_ERROR.denied)
    }

    /**
     * A custom callback rather than `failureRedirect`, because every outcome here needs a
     * *different* destination and `req.oauthFlow` — set by the state store once the nonce
     * matched — is not readable from passport's own option object.
     */
    return passport.authenticate(
      GOOGLE_STRATEGY,
      { session: false },
      (err: unknown, identity: GoogleIdentity | false, info: unknown) => {
        const returnPath = req.oauthFlow?.returnPath ?? null

        if (err) return next(err)
        if (!identity) return redirectWithError(res, returnPath, failureCode(info))

        return resolveGoogleAccount(req, res, identity).catch(next)
      }
    )(req, res, next)
  })
)

/**
 * Decides what a verified Google identity means for this account, and where to send the
 * browser next. Four outcomes: sign in, link, park for completion, or refuse.
 */
const resolveGoogleAccount = async (req: Request, res: Response, identity: GoogleIdentity): Promise<void> => {
  const flow = req.oauthFlow ?? null
  const returnPath = flow?.returnPath ?? null
  const locale = localeOf(returnPath)

  if (flow?.intent === 'link') return linkGoogleAccount(res, flow.userId, identity, returnPath)

  const byGoogleId = await prisma.user.findUnique({ where: { googleId: identity.googleId } })
  if (byGoogleId) return signInResolvedUser(res, byGoogleId.id, identity, flow?.role ?? null, returnPath, locale)

  const byEmail = await prisma.user.findUnique({ where: { email: identity.email } })

  /**
   * A **verified** account already belongs to someone, and Google proving the same address
   * does not make it theirs to take over — the owner may have set a password precisely so
   * that only they can get in. Refused rather than linked; linking is an explicit action
   * from account settings, where a live session proves ownership.
   */
  if (byEmail?.emailVerifiedAt) {
    return redirectWithError(res, returnPath, GOOGLE_ERROR.accountExists)
  }

  /**
   * An **unverified** row is a different matter: nobody can sign in to it, so nobody owns
   * it yet, and Google has just proved control of the address it was registered with.
   * Claiming it is what the schema's `tokenVersion` note calls "the Google claim of an
   * unverified account" — the bump invalidates any cookie minted before the claim, and the
   * pending verification token is dropped so the old emailed link stops working.
   */
  if (byEmail) {
    const claimed = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: identity.googleId,
        authProvider: 'google',
        emailVerifiedAt: new Date(),
        pendingEmail: null,
        emailVerifyTokenHash: null,
        emailVerifyExpiresAt: null,
        failedLoginCount: 0,
        failedLoginWindowStartedAt: null,
        tokenVersion: { increment: 1 },
      },
    })
    return signInResolvedUser(res, claimed.id, identity, flow?.role ?? null, returnPath, locale)
  }

  return parkForCompletion(res, identity, flow?.role ?? null, locale)
}

/**
 * Signs in a resolved user, or parks them if the account has no profile yet — an account
 * can exist without one when a registration was abandoned before the profile was written.
 */
const signInResolvedUser = async (
  res: Response,
  userId: string,
  identity: GoogleIdentity,
  role: 'consumer' | 'provider' | null,
  returnPath: string | null,
  locale: string
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return redirectWithError(res, returnPath, GOOGLE_ERROR.exchangeFailed)

  const profile = await loadProfile(user.id)
  if (!profile) return parkForCompletion(res, identity, role, locale)

  issueSession(res, user, profile)
  res.redirect(webUrl(returnPath ?? `/${locale}/auth/callback`, { status: 'signed-in' }))
}

/**
 * Holds the verified identity in a short-lived cookie and sends the browser to the form
 * that collects what Google cannot supply — the role and a phone number, both required by
 * the profile tables.
 */
const parkForCompletion = (
  res: Response,
  identity: GoogleIdentity,
  role: 'consumer' | 'provider' | null,
  locale: string
): void => {
  const payload: PendingGoogleAccount = { ...identity, role, locale }
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: Math.floor(config.oauthPendingTtlMs / 1000),
  })

  res.cookie(config.oauthPendingCookieName, token, {
    ...pendingCookieOptions(),
    maxAge: config.oauthPendingTtlMs,
  })

  res.redirect(webUrl(`/${locale}/auth/complete-registration`))
}

/** Attaches a Google identity to the account pinned at initiate. */
const linkGoogleAccount = async (
  res: Response,
  userId: string | null,
  identity: GoogleIdentity,
  returnPath: string | null
): Promise<void> => {
  if (!userId) return redirectWithError(res, returnPath, GOOGLE_ERROR.unauthorized)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return redirectWithError(res, returnPath, GOOGLE_ERROR.unauthorized)

  if (user.googleId) {
    // Already linked — to this same identity or another. Either way there is nothing to do
    // and the answer is the same, so the branch does not distinguish them.
    return redirectWithError(res, returnPath, GOOGLE_ERROR.alreadyLinked)
  }

  const owner = await prisma.user.findUnique({ where: { googleId: identity.googleId } })
  if (owner && owner.id !== user.id) {
    return redirectWithError(res, returnPath, GOOGLE_ERROR.accountMismatch)
  }

  await prisma.user.update({
    where: { id: user.id },
    // `authProvider` is left alone: it records how the account was created, and linking
    // Google to an account that still has its password does not change that. The
    // `user_credential_present` CHECK is satisfied either way.
    data: { googleId: identity.googleId },
  })

  res.redirect(webUrl(returnPath ?? `/${localeOf(returnPath)}/auth/callback`, { status: 'linked' }))
}

/* ================================================================== *
 * GET /identity/google/pending — prefill for the completion form
 * ================================================================== */

/** Reads the pending cookie, or `null` when there is none / it expired. */
const readPending = (req: Request): PendingGoogleAccount | null => {
  const raw = req.cookies?.[config.oauthPendingCookieName] as string | undefined
  if (!raw) return null
  try {
    return jwt.verify(raw, config.jwtSecret) as PendingGoogleAccount
  } catch {
    return null
  }
}

/**
 * What the completion form shows above its fields. The email is **not** editable — it is
 * the thing Google verified, and letting it be changed would turn this into a way to
 * register any address without proving control of it.
 */
googleRouter.get(
  '/pending',
  asyncHandler(async (req, res) => {
    const pending = readPending(req)
    if (!pending) return fail(res, 'No Google sign-up in progress', AUTH_ERROR.invalidToken, 404)

    return ok(res, {
      email: pending.email,
      firstName: pending.firstName,
      lastName: pending.lastName,
      role: pending.role,
      image: pending.avatarUrl,
    })
  })
)

/* ================================================================== *
 * POST /identity/google/complete — create the account and sign in
 * ================================================================== */

googleRouter.post(
  '/complete',
  asyncHandler(async (req, res) => {
    const pending = readPending(req)
    if (!pending) return fail(res, 'No Google sign-up in progress', AUTH_ERROR.invalidToken, 404)

    const role = req.body?.role ?? req.body?.userType ?? pending.role
    if (role !== 'consumer' && role !== 'provider') return fail(res, 'role must be consumer or provider')

    const profile: RegistrationProfile = req.body?.profile ?? req.body ?? {}
    // Google's name is the default, but the form may correct it — a Google display name is
    // often a handle rather than the name a provider wants published.
    const firstName = asBoundedString(profile.firstName, MAX_NAME_LENGTH) ?? pending.firstName
    const lastName = asBoundedString(profile.lastName, MAX_NAME_LENGTH) ?? pending.lastName
    if (!firstName) return fail(res, 'First name is required')

    const phone = asPhone(req.body?.phone ?? (profile as { phone?: unknown }).phone)
    if (!phone) return fail(res, 'A valid phone code and number are required')

    const country = asCountryCode(profile.country)

    const verdict = completeIpLimiter(`ip:${req.ip ?? 'unknown'}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      return fail(res, 'Too many attempts. Please try again later.', 429, 429)
    }

    const organizationId = role === 'provider' ? await resolveOrganizationId(profile) : undefined

    /**
     * `emailVerifiedAt` is stamped at creation: Google confirmed the address, which is the
     * same proof the emailed link provides, so sending one would ask the user to prove
     * something already proven. No `passwordHash` — `user_credential_present` is satisfied
     * by `googleId`, and a Google-only account has no password to check.
     */
    try {
      const user = await prisma.$transaction(async (tx) => {
        const saved = await tx.user.create({
          data: {
            email: pending.email,
            emailVerifiedAt: new Date(),
            googleId: pending.googleId,
            authProvider: 'google',
          },
        })

        if (role === 'provider') {
          await tx.provider.create({
            data: {
              userId: saved.id,
              firstName,
              lastName: lastName ?? '',
              phoneCode: phone.phoneCode,
              phoneNumber: phone.phoneNumber,
              country,
              organizationId,
              weekSchedule: {},
              listed: false,
            },
          })
        } else {
          await tx.consumer.create({
            data: {
              userId: saved.id,
              firstName,
              lastName: lastName ?? '',
              phoneCode: phone.phoneCode,
              phoneNumber: phone.phoneNumber,
              country,
            },
          })
        }

        return saved
      })

      const resolved = await loadProfile(user.id)
      if (!resolved) return fail(res, 'Could not create the profile', 500, 500)

      res.clearCookie(config.oauthPendingCookieName, pendingCookieOptions())
      return ok(res, issueSession(res, user, resolved))
    } catch (error) {
      /**
       * The address or the Google id was claimed between parking and completing — a second
       * tab finishing first, or a registration in the meantime. The cookie is cleared so
       * the user restarts rather than retrying a request that can only fail again.
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        res.clearCookie(config.oauthPendingCookieName, pendingCookieOptions())
        return fail(res, 'That account already exists. Please sign in instead.', AUTH_ERROR.emailTaken, 409)
      }
      throw error
    }
  })
)
