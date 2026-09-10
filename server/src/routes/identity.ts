import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { googleRouter } from './identity-google.js'
import { config } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import {
  sendAlreadyRegisteredNotice,
  sendEmailChangeStartedNotice,
  sendGoogleSignInGuidance,
  sendPasswordChangedNotice,
} from '../lib/auth-notices.js'
import {
  buildEmailVerifyUrl,
  emailVerifyTokensMatch,
  hashEmailVerifyToken,
  isAllowedEmailVerifyReturnPath,
  issuePendingEmailVerify,
  sendVerificationEmail,
} from '../lib/email-verify.js'
import {
  hashPassword,
  needsRehash,
  validatePassword,
  verifyDummyPassword,
  verifyPassword,
} from '../lib/password.js'
import {
  buildPasswordResetUrl,
  issuePasswordResetToken,
  sendPasswordResetEmail,
} from '../lib/password-reset.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter, type RateLimiter } from '../lib/rateLimit.js'
import { asBoundedString, asTrimmedString, isEmail } from '../lib/request.js'
import { asVerifyLocale } from '../lib/return-path.js'
import { clearSessionCookie, setSessionCookie } from '../lib/session.js'
import { hashUrlToken, urlTokensMatch } from '../lib/token.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

export const identityRouter = Router()

identityRouter.use('/google', googleRouter)

/**
 * Stable application codes for the auth branches the client must **react** to rather than
 * merely display — it has to render a "resend verification" button for one 403 and a plain
 * message for another, and string-matching an error message is not a contract.
 *
 * Every other route in this codebase passes the HTTP status as the envelope's `code`. This
 * router deliberately deviates; mirrored in `src/api/auth/types.ts`.
 */
export const AUTH_ERROR = {
  invalidCredentials: 4001,
  emailUnverified: 4002,
  passwordPolicy: 4003,
  invalidToken: 4004,
  expiredToken: 4005,
  googleOnlyAccount: 4006,
  reauthRequired: 4007,
  emailTaken: 4008,
  hasAppointments: 4009,
} as const

/**
 * One constant, not a string typed at three call sites. Two nearly-identical messages that
 * differ by a full stop are a distinguisher, and that is exactly the drift a shared literal
 * prevents.
 */
const INVALID_CREDENTIALS = 'Invalid email or password'

const MAX_NAME_LENGTH = 40

/* ------------------------------------------------------------------ *
 * Rate limits
 *
 * Per-IP, in-memory and per-process — an abuse brake, not an accounting boundary (see
 * `lib/rateLimit.ts`). Counted **after** validation so a malformed body never spends from
 * the budget, which is the rule `routes/contact.ts` established.
 *
 * `server/CLAUDE.md` makes this mandatory rather than optional for the routes that send:
 * the mail engine's own limit is per-IP as *it* sees callers, and it only ever sees this
 * server, so every send here shares one bucket with transactional mail.
 * ------------------------------------------------------------------ */

const HOUR = 60 * 60 * 1000

const registerIpLimiter = createRateLimiter({ limit: 5, windowMs: HOUR })
const registerEmailLimiter = createRateLimiter({ limit: 3, windowMs: 24 * HOUR })
const loginIpLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60 * 1000 })
const verifyIpLimiter = createRateLimiter({ limit: 20, windowMs: HOUR })
const resendIpLimiter = createRateLimiter({ limit: 5, windowMs: HOUR })
const resendEmailLimiter = createRateLimiter({ limit: 3, windowMs: HOUR })
const forgotIpLimiter = createRateLimiter({ limit: 5, windowMs: HOUR })
const forgotEmailLimiter = createRateLimiter({ limit: 3, windowMs: HOUR })
const resetIpLimiter = createRateLimiter({ limit: 10, windowMs: HOUR })
const sessionActionLimiter = createRateLimiter({ limit: 10, windowMs: HOUR })

/** Applies a limiter and answers 429 with `Retry-After`, as `routes/contact.ts` does. */
const overBudget = (res: Parameters<typeof fail>[0], limiter: RateLimiter, key: string): boolean => {
  const verdict = limiter(key)
  if (verdict.allowed) return false
  res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
  fail(res, 'Too many attempts. Please try again later.', 429, 429)
  return true
}

const ipKey = (ip: string | undefined) => `ip:${ip ?? 'unknown'}`

/* ------------------------------------------------------------------ *
 * Body helpers
 * ------------------------------------------------------------------ */

export type RegistrationProfile = {
  firstName?: unknown
  lastName?: unknown
  email?: unknown
  country?: unknown
  organizationId?: unknown
  organizationName?: unknown
}

/**
 * ISO 3166-1 alpha-2, as picked on the phone field at registration.
 *
 * Validated to shape rather than against a country list: `libphonenumber-js` on the
 * client is the source of the options, and duplicating its table here would be a second
 * list to keep in step. Anything that is not two letters is dropped rather than stored,
 * so a malformed value never reaches the column.
 *
 * Not derivable from `phone.code`, which is why it is sent separately — +1 is the US,
 * Canada and ~20 more. **Google does not supply one either**: its `locale` is a BCP-47
 * language tag, so `en-GB` would yield a wrong country and `hy` none at all. That is why
 * the Google completion step collects it through the same field.
 */
export const asCountryCode = (value: unknown): string | undefined => {
  const trimmed = asTrimmedString(value)?.toUpperCase()
  return trimmed && /^[A-Z]{2}$/.test(trimmed) ? trimmed : undefined
}

export type ParsedPhone = { phoneCode: number; phoneNumber: bigint }

/**
 * Phone is **mandatory but never verified** — informative data a provider needs in order to
 * reach a client, not identity. So it is validated to shape only.
 *
 * **No uniqueness check, deliberately.** The old `@@unique` existed solely because phone
 * was the identity; a clinic line shared by four providers is ordinary. A unique constraint
 * on a field with no verification behind it would also hand back the enumeration oracle
 * this migration removed.
 */
export const asPhone = (value: unknown): ParsedPhone | null => {
  const raw = (value ?? {}) as { code?: unknown; number?: unknown }
  const code = Number(raw.code)
  const digits = asTrimmedString(raw.number) ?? String(raw.number ?? '')

  if (!Number.isInteger(code) || code <= 0 || code > 9999) return null
  if (!/^\d{4,15}$/.test(digits)) return null

  return { phoneCode: code, phoneNumber: BigInt(digits) }
}

/**
 * Resolves the provider registration form's Organization field, which is a combobox:
 * an id means an existing organization was picked, a bare name means the provider typed
 * one that may or may not exist yet. Matching is case-insensitive so "Acme Services" and
 * "acme services" do not become two organizations.
 */
export const resolveOrganizationId = async (profile: RegistrationProfile): Promise<string | undefined> => {
  const organizationId = asTrimmedString(profile.organizationId)
  if (organizationId) {
    const existing = await prisma.organization.findUnique({ where: { id: organizationId } })
    if (existing) return existing.id
  }

  const organizationName = asTrimmedString(profile.organizationName)
  if (!organizationName) return undefined

  const matched = await prisma.organization.findFirst({
    where: { name: { equals: organizationName, mode: 'insensitive' } },
  })
  if (matched) return matched.id

  const created = await prisma.organization.create({ data: { name: organizationName } })
  return created.id
}

/* ------------------------------------------------------------------ *
 * Per-account failed-login brake
 *
 * Two `User` columns rather than `lib/rateLimit.ts`, because that limiter is in-memory and
 * per-process: it resets on every deploy and every `tsx watch` reload, and is not shared
 * across instances — the two properties that matter most for credential stuffing. These
 * columns are read for free on the login lookup and written only on a failure.
 *
 * A **rolling brake, not a lockout**: the window expires on its own. With no admin surface
 * there is nobody to unlock an account, so a permanent lock would be a support ticket and a
 * denial of service aimed at the victim rather than the attacker.
 *
 * What it does **not** stop: a distributed spray of one attempt per account across many
 * accounts. Nothing per-account can; that is the per-IP limiter's job, and before running a
 * second API instance that layer needs to move to the proxy or a shared store.
 * ------------------------------------------------------------------ */

const FAILED_LOGIN_LIMIT = 10
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000

type Throttleable = { id: string; failedLoginCount: number; failedLoginWindowStartedAt: Date | null }

const windowIsLive = (user: Throttleable): boolean =>
  Boolean(
    user.failedLoginWindowStartedAt &&
      Date.now() - user.failedLoginWindowStartedAt.getTime() < FAILED_LOGIN_WINDOW_MS
  )

const isAccountThrottled = (user: Throttleable): boolean =>
  user.failedLoginCount >= FAILED_LOGIN_LIMIT && windowIsLive(user)

const recordFailedLogin = async (user: Throttleable): Promise<void> => {
  await prisma.user.update({
    where: { id: user.id },
    data: windowIsLive(user)
      ? { failedLoginCount: { increment: 1 } }
      : { failedLoginCount: 1, failedLoginWindowStartedAt: new Date() },
  })
}

/** The happy path writes nothing — the early return is what keeps a normal login read-only. */
const clearFailedLogins = async (user: Throttleable): Promise<void> => {
  if (user.failedLoginCount === 0) return
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, failedLoginWindowStartedAt: null },
  })
}

/* ------------------------------------------------------------------ *
 * Session issuance
 * ------------------------------------------------------------------ */

export type ProfileSummary = {
  role: 'consumer' | 'provider'
  profileId: string
  firstName: string
  lastName: string
  image?: string
}

/**
 * A returning user does not restate what they are, so the role is read off whichever
 * profile exists. A user holding both resolves to provider — the account with more to
 * manage — which is the rule the phone+OTP flow used and is unchanged by this migration.
 */
export const loadProfile = async (userId: string): Promise<ProfileSummary | null> => {
  const [provider, consumer] = await Promise.all([
    prisma.provider.findUnique({ where: { userId } }),
    prisma.consumer.findUnique({ where: { userId } }),
  ])

  if (provider) {
    return {
      role: 'provider',
      profileId: provider.id,
      firstName: provider.firstName,
      lastName: provider.lastName,
      image: provider.imageUrl ?? undefined,
    }
  }
  if (consumer) {
    return { role: 'consumer', profileId: consumer.id, firstName: consumer.firstName, lastName: consumer.lastName }
  }
  return null
}

/** Issues the cookie and returns the body every sign-in path answers with. */
export const issueSession = (
  res: Parameters<typeof ok>[0],
  user: { id: string; tokenVersion: number },
  profile: ProfileSummary
) => {
  setSessionCookie(res, {
    userId: user.id,
    role: profile.role,
    profileId: profile.profileId,
    tokenVersion: user.tokenVersion,
  })
  return {
    role: profile.role,
    profileId: profile.profileId,
    userId: user.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    image: profile.image,
  }
}

/* ================================================================== *
 * POST /identity/register
 * ================================================================== */

/**
 * Creates the account and mails a verification link. **Does not sign anyone in** — an
 * unverified account cannot hold a session, so the funnel continues from the emailed link.
 *
 * Every branch answers with the *same* body, and a failed send is logged rather than
 * surfaced. That symmetry is the whole anti-enumeration design: a 409 for a taken address,
 * or a 502 when a send fails for a new one, would each turn this route into an oracle for
 * which addresses hold accounts.
 */
identityRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const role = req.body?.role ?? req.body?.userType
    if (role !== 'consumer' && role !== 'provider') {
      return fail(res, 'role must be consumer or provider')
    }

    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    if (!email || !isEmail(email)) return fail(res, 'Valid email required')

    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const policy = validatePassword(password, { email })
    if (!policy.ok) return fail(res, policy.message, AUTH_ERROR.passwordPolicy)

    const profile: RegistrationProfile = req.body?.profile ?? req.body ?? {}
    const firstName = asBoundedString(profile.firstName, MAX_NAME_LENGTH)
    const lastName = asBoundedString(profile.lastName, MAX_NAME_LENGTH)
    if (!firstName) return fail(res, 'First name is required')
    if (!lastName) return fail(res, 'Last name is required')

    const phone = asPhone(req.body?.phone ?? (profile as { phone?: unknown }).phone)
    if (!phone) return fail(res, 'A valid phone code and number are required')

    const country = asCountryCode(profile.country)
    const locale = asVerifyLocale(req.body?.locale)

    if (overBudget(res, registerIpLimiter, ipKey(req.ip))) return

    /**
     * Hashed **before** the existence lookup, on purpose.
     *
     * The already-registered branch does no argon2 work, so without this an existing
     * address would answer in ~2ms and a new one in ~85ms — a cleaner oracle than any
     * error message could be. The cost is one wasted hash on the minority branch.
     */
    const passwordHash = await hashPassword(password)

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    })

    // Already a real account. Write nothing, and tell its owner — in their own inbox, which
    // is the only place the information is not a leak.
    if (existing?.emailVerifiedAt) {
      if (!overBudget(res, registerEmailLimiter, `email:${email}`)) {
        const notice = await sendAlreadyRegisteredNotice(email, locale)
        if (!notice.ok) console.error(`[identity] already-registered notice failed: ${notice.message}`)
      }
      return ok(res, true)
    }

    const organizationId = role === 'provider' ? await resolveOrganizationId(profile) : undefined

    /**
     * An **unverified** row is overwritten rather than refused.
     *
     * It is not yet an identity anyone owns — nobody can sign in to it, because signing in
     * requires the verification link. Refusing would strand a user who mistyped their name
     * or never received the mail: they cannot log in to fix it and it is not theirs to
     * delete. The residual risk is that someone who knows an unverified address can reset
     * what is stored on it; they still cannot sign in without the mailbox, and re-issuing
     * the token invalidates the link the real owner may be holding.
     */
    const user = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { passwordHash, authProvider: 'local', pendingEmail: email },
          })
        : await tx.user.create({
            data: { email, pendingEmail: email, passwordHash, authProvider: 'local' },
          })

      // `upsert` on the profile, because a re-registration may have switched role — and the
      // other role's row, if any, is left alone rather than deleted.
      if (role === 'provider') {
        await tx.provider.upsert({
          where: { userId: saved.id },
          create: {
            userId: saved.id,
            firstName,
            lastName,
            phoneCode: phone.phoneCode,
            phoneNumber: phone.phoneNumber,
            country,
            organizationId,
            weekSchedule: {},
            listed: false,
          },
          update: { firstName, lastName, phoneCode: phone.phoneCode, phoneNumber: phone.phoneNumber, country },
        })
      } else {
        await tx.consumer.upsert({
          where: { userId: saved.id },
          create: {
            userId: saved.id,
            firstName,
            lastName,
            phoneCode: phone.phoneCode,
            phoneNumber: phone.phoneNumber,
            country,
          },
          update: { firstName, lastName, phoneCode: phone.phoneCode, phoneNumber: phone.phoneNumber, country },
        })
      }

      return saved
    })

    const token = await issuePendingEmailVerify(user.id, email)
    const verifyUrl = buildEmailVerifyUrl(config.corsOrigin, `/${locale}/auth/verify-email`, token)

    // Logged, never surfaced — see the route docstring. `resend-verification` is the
    // recovery path, and the row plus the token hash are already committed.
    const sent = await sendVerificationEmail(email, verifyUrl)
    if (!sent.ok) console.error(`[identity] verification email failed: ${sent.message}`)

    return ok(res, true)
  })
)

/* ================================================================== *
 * POST /identity/login
 * ================================================================== */

identityRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!email || !password) return fail(res, 'Email and password required')

    // Before any hashing: argon2 at 64 MiB is the expensive thing being protected, so an
    // over-budget attempt must never buy one.
    if (overBudget(res, loginIpLimiter, ipKey(req.ip))) return

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        emailVerifiedAt: true,
        tokenVersion: true,
        failedLoginCount: true,
        failedLoginWindowStartedAt: true,
      },
    })

    /**
     * Unknown address, **or** a Google-only account with no password. Both burn the same
     * ~80ms and answer identically.
     *
     * Collapsing them is required, not tidiness: saying "this account signs in with Google"
     * would confirm the address exists. The discoverable path is a *static* hint under the
     * sign-in form, which renders unconditionally and therefore leaks nothing, plus the
     * guidance email that `forgot-password` sends to the account's own inbox.
     */
    if (!user?.passwordHash) {
      await verifyDummyPassword(password)
      return fail(res, INVALID_CREDENTIALS, AUTH_ERROR.invalidCredentials, 401)
    }

    // The 429 here only fires for an address that exists, so it is itself a mild oracle.
    // Accepted rather than papered over: observing it costs ~10 failed attempts against one
    // address, and the per-IP limiter bounds how fast that can be probed across many.
    if (isAccountThrottled(user)) {
      res.setHeader('Retry-After', String(Math.ceil(FAILED_LOGIN_WINDOW_MS / 1000)))
      return fail(res, 'Too many failed attempts. Please try again later.', 429, 429)
    }

    const valid = await verifyPassword(user.passwordHash, password)
    if (!valid) {
      await recordFailedLogin(user)
      return fail(res, INVALID_CREDENTIALS, AUTH_ERROR.invalidCredentials, 401)
    }

    /**
     * Verified is checked **after** the compare, unlike the reference implementation.
     *
     * Whoever reaches this line already holds the password, so a distinct 403 tells them
     * nothing they did not know. Checking first would fire this branch on a *wrong*
     * password too, which is a free existence oracle.
     */
    if (!user.emailVerifiedAt) {
      await clearFailedLogins(user)
      return fail(
        res,
        'Please confirm your email address before you sign in. Check your inbox, or request a new link.',
        AUTH_ERROR.emailUnverified,
        403
      )
    }

    const profile = await loadProfile(user.id)
    if (!profile) throw new HttpError(404, 'Profile not found', 404)

    // Transparent parameter upgrade. Awaited rather than fired and forgotten: an unawaited
    // write in an Express handler can outlive the response and lose its rejection.
    if (needsRehash(user.passwordHash)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      })
    }

    await clearFailedLogins(user)
    return ok(res, issueSession(res, user, profile))
  })
)

/* ================================================================== *
 * Email verification
 * ================================================================== */

/**
 * Confirms an address and signs the user in.
 *
 * Looked up by **token hash**, not by session — the recipient of a signup link has no
 * session yet, which is why `User.emailVerifyTokenHash` is unique. Signing them in from the
 * link is deliberate: the token is single-use and short-lived, and the alternative is a
 * login form one click later.
 */
const verifyEmailHandler = asyncHandler(async (req, res) => {
  const token = asTrimmedString(req.body?.token)
    if (!token) return fail(res, 'Verification token required')

    if (overBudget(res, verifyIpLimiter, ipKey(req.ip))) return

    const user = await prisma.user.findUnique({
      where: { emailVerifyTokenHash: hashEmailVerifyToken(token) },
      select: {
        id: true,
        pendingEmail: true,
        emailVerifyTokenHash: true,
        emailVerifyExpiresAt: true,
        emailVerifiedAt: true,
        tokenVersion: true,
      },
    })

    if (!user?.emailVerifyTokenHash || !user.pendingEmail) {
      return fail(res, 'Invalid verification link', AUTH_ERROR.invalidToken, 401)
    }
    if (user.emailVerifyExpiresAt && user.emailVerifyExpiresAt < new Date()) {
      return fail(res, 'Verification link expired', AUTH_ERROR.expiredToken, 401)
    }
    if (!emailVerifyTokensMatch(token, user.emailVerifyTokenHash)) {
      return fail(res, 'Invalid verification link', AUTH_ERROR.invalidToken, 401)
    }

    const pendingEmail = user.pendingEmail
    const wasAlreadyVerified = Boolean(user.emailVerifiedAt)

    /**
     * One unconditional path for both flows. Registration writes the signup address to
     * `email` *and* `pendingEmail`, and a change-email writes only `pendingEmail`, so
     * copying `pendingEmail` onto `email` is correct either way — there is no flow
     * discriminator to get wrong.
     */
    let updated: { id: string; tokenVersion: number }
    try {
      updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: pendingEmail,
          emailVerifiedAt: new Date(),
          pendingEmail: null,
          emailVerifyTokenHash: null,
          emailVerifyExpiresAt: null,
          // An email change moves the login identifier, so every other session must go.
          // A first-time signup verification has none to strand.
          ...(wasAlreadyVerified ? { tokenVersion: { increment: 1 } } : {}),
        },
        select: { id: true, tokenVersion: true },
      })
    } catch (error) {
      // Someone else verified this address in the window between send and confirm. A 409
      // rather than a stack trace; the caller keeps their current address.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return fail(res, 'That email address is already in use', AUTH_ERROR.emailTaken, 409)
      }
      throw error
    }

    const profile = await loadProfile(user.id)
    if (!profile) throw new HttpError(404, 'Profile not found', 404)

  return ok(res, {
    ...issueSession(res, updated, profile),
    email: pendingEmail,
    // The funnel signal moved here from the login response: registration no longer signs
    // anyone in, so this is the first moment a brand-new account has a session.
    isNewUser: !wasAlreadyVerified,
  })
})

identityRouter.post('/verify-email', verifyEmailHandler)

/**
 * Confirming an email change is the *same* operation as confirming a signup — copy
 * `pendingEmail` onto `email`, bump `tokenVersion` when the account was already verified,
 * catch the `P2002` race — so it shares one handler rather than a second implementation
 * that could drift. Kept as its own path because the client already calls it, and behind
 * `requireAuth` because a change is only ever started from a session.
 */
identityRouter.post('/change-email/confirm', requireAuth, verifyEmailHandler)

identityRouter.post(
  '/resend-verification',
  asyncHandler(async (req, res) => {
    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    if (!email || !isEmail(email)) return fail(res, 'Valid email required')
    const locale = asVerifyLocale(req.body?.locale)

    if (overBudget(res, resendIpLimiter, ipKey(req.ip))) return
    if (overBudget(res, resendEmailLimiter, `email:${email}`)) return

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    })

    // Same answer for "no such account", "already verified" and "link re-sent". Anything
    // else re-opens the enumeration `register` closed.
    if (user && !user.emailVerifiedAt) {
      const token = await issuePendingEmailVerify(user.id, email)
      const verifyUrl = buildEmailVerifyUrl(config.corsOrigin, `/${locale}/auth/verify-email`, token)
      const sent = await sendVerificationEmail(email, verifyUrl)
      if (!sent.ok) console.error(`[identity] verification resend failed: ${sent.message}`)
    }

    return ok(res, true)
  })
)

/* ================================================================== *
 * Password reset
 * ================================================================== */

identityRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    if (!email || !isEmail(email)) return fail(res, 'Valid email required')
    const locale = asVerifyLocale(req.body?.locale)

    if (overBudget(res, forgotIpLimiter, ipKey(req.ip))) return
    if (overBudget(res, forgotEmailLimiter, `email:${email}`)) return

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, googleId: true },
    })

    if (user?.passwordHash) {
      const token = await issuePasswordResetToken(user.id)
      const resetUrl = buildPasswordResetUrl(config.corsOrigin, locale, token)
      const sent = await sendPasswordResetEmail(email, resetUrl)
      // Reported to our logs, never to the caller — see below.
      if (!sent.ok) console.error(`[identity] password reset email failed: ${sent.message}`)
    } else if (user?.googleId) {
      // Passwordless. Silence here reads as a broken flow, so say where their sign-in
      // actually lives — to their own address, which reveals nothing to anyone else.
      const sent = await sendGoogleSignInGuidance(email, locale)
      if (!sent.ok) console.error(`[identity] google guidance email failed: ${sent.message}`)
    }

    /**
     * **Every** branch answers identically, including after a mail failure. That last part
     * matters: a 502 on a real address beside a 200 on an unknown one would make a mail
     * outage into an account-enumeration oracle.
     */
    return ok(res, true)
  })
)

identityRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const token = asTrimmedString(req.body?.token)
    if (!token) return fail(res, 'Reset token required')

    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const locale = asVerifyLocale(req.body?.locale)

    if (overBudget(res, resetIpLimiter, ipKey(req.ip))) return

    const user = await prisma.user.findUnique({
      where: { passwordResetTokenHash: hashUrlToken(token) },
      select: { id: true, email: true, passwordResetTokenHash: true, passwordResetExpiresAt: true },
    })

    if (!user?.passwordResetTokenHash) return fail(res, 'Invalid reset link', AUTH_ERROR.invalidToken, 401)
    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      return fail(res, 'Reset link expired', AUTH_ERROR.expiredToken, 401)
    }
    if (!urlTokensMatch(token, user.passwordResetTokenHash)) {
      return fail(res, 'Invalid reset link', AUTH_ERROR.invalidToken, 401)
    }

    // Checked after the token so an invalid link never reports a policy problem.
    const policy = validatePassword(password, { email: user.email })
    if (!policy.ok) return fail(res, policy.message, AUTH_ERROR.passwordPolicy)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        // Completing a reset also proves the mailbox, so it clears the verification gate
        // for a user whose original link never arrived — otherwise they reset their
        // password and still could not sign in.
        emailVerifiedAt: new Date(),
        // **The whole point of `tokenVersion`.** Reset exists for the case where someone
        // else has your account; leaving their 7-day cookie alive would defeat it.
        tokenVersion: { increment: 1 },
        failedLoginCount: 0,
        failedLoginWindowStartedAt: null,
      },
    })

    const notice = await sendPasswordChangedNotice(user.email, locale)
    if (!notice.ok) console.error(`[identity] password changed notice failed: ${notice.message}`)

    // **No session is issued.** One fresh sign-in exercises the new password immediately,
    // which is what catches a password manager that saved something else.
    return ok(res, true)
  })
)

identityRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : ''
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''
    const locale = asVerifyLocale(req.body?.locale)

    if (overBudget(res, sessionActionLimiter, `session:${req.session!.userId}`)) return

    const user = await prisma.user.findUnique({
      where: { id: req.session!.userId },
      select: { id: true, email: true, passwordHash: true },
    })
    if (!user) throw new HttpError(404, 'Account not found', 404)

    /**
     * A Google-only account is routed through forgot-password rather than given a
     * "set your first password" endpoint here.
     *
     * Setting a password from a session alone, with no second factor, means a stolen
     * session can lock the owner out of their own account. Going via the emailed link
     * reuses the mailbox proof and adds no new surface.
     */
    if (!user.passwordHash) {
      return fail(
        res,
        'This account signs in with Google. Use "Forgot password" to set a password.',
        AUTH_ERROR.googleOnlyAccount
      )
    }

    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      return fail(res, 'Current password is incorrect', AUTH_ERROR.reauthRequired, 401)
    }
    if (newPassword === currentPassword) {
      return fail(res, 'The new password must be different', AUTH_ERROR.passwordPolicy)
    }

    const policy = validatePassword(newPassword, { email: user.email })
    if (!policy.ok) return fail(res, policy.message, AUTH_ERROR.passwordPolicy)

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        tokenVersion: { increment: 1 },
      },
      select: { id: true, tokenVersion: true },
    })

    // Bump, then re-issue *this* caller's cookie at the new version: the tab you changed it
    // in stays signed in, every other device is stranded.
    setSessionCookie(res, { ...req.session!, tokenVersion: updated.tokenVersion })

    const notice = await sendPasswordChangedNotice(user.email, locale)
    if (!notice.ok) console.error(`[identity] password changed notice failed: ${notice.message}`)

    return ok(res, true)
  })
)

/* ================================================================== *
 * Session
 * ================================================================== */

/**
 * Lets the client recover its own role and profile id after a refresh — the session lives
 * in an httpOnly cookie the browser cannot read. Also returns display fields so the
 * Header avatar does not need a second profile fetch, and the account-state flags the
 * settings page needs in order to render "Change password" versus "Set a password".
 */
identityRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role, profileId, userId } = req.session!

    const [user, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerifiedAt: true, authProvider: true, passwordHash: true, googleId: true },
      }),
      role === 'provider'
        ? prisma.provider.findUnique({ where: { id: profileId } })
        : prisma.consumer.findUnique({ where: { id: profileId } }),
    ])

    if (!user) throw new HttpError(404, 'Account not found', 404)
    if (!profile) throw new HttpError(404, `${role === 'provider' ? 'Provider' : 'Consumer'} profile not found`, 404)

    return ok(res, {
      role,
      profileId,
      userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      image: 'imageUrl' in profile ? (profile.imageUrl ?? undefined) : undefined,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      authProvider: user.authProvider,
      phone: { code: profile.phoneCode, number: Number(profile.phoneNumber) },
      /** Never the hash — only whether one exists, which is all the UI needs to branch on. */
      hasPassword: Boolean(user.passwordHash),
      hasGoogle: Boolean(user.googleId),
    })
  })
)

identityRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    /**
     * `everywhere` bumps `tokenVersion`, stranding every other device. A plain logout
     * deliberately does **not** — signing out on a laptop must not sign out a phone.
     */
    if (req.body?.everywhere === true) {
      await prisma.user.update({
        where: { id: req.session!.userId },
        data: { tokenVersion: { increment: 1 } },
      })
    }

    clearSessionCookie(res)
    return ok(res, true)
  })
)

/* ================================================================== *
 * Phone — an ordinary profile field now
 * ================================================================== */

/**
 * Replaces the two `change-phone` OTP routes. No code, no pending state, no verification:
 * phone is informative data, so changing it is a plain write to the caller's own profile.
 */
identityRouter.patch(
  '/phone',
  requireAuth,
  asyncHandler(async (req, res) => {
    const phone = asPhone(req.body?.phone)
    if (!phone) return fail(res, 'A valid phone code and number are required')
    const country = asCountryCode(req.body?.country)

    const data = { ...phone, ...(country ? { country } : {}) }
    if (req.session!.role === 'provider') {
      await prisma.provider.update({ where: { id: req.session!.profileId }, data })
    } else {
      await prisma.consumer.update({ where: { id: req.session!.profileId }, data })
    }

    return ok(res, { phone: { code: phone.phoneCode, number: Number(phone.phoneNumber) } })
  })
)

/* ================================================================== *
 * Changing the identity email
 * ================================================================== */

/**
 * Email is the login identifier now, so this endpoint changes **who can sign in**. It is no
 * longer a profile-field edit and cannot be authorised by session possession alone — a
 * stolen session would otherwise reassign the account outright. Hence the password.
 */
identityRouter.post(
  '/change-email/send',
  requireAuth,
  asyncHandler(async (req, res) => {
    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    if (!email || !isEmail(email)) return fail(res, 'Valid email required')

    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const returnPath = asTrimmedString(req.body?.returnPath)
    const locale = asVerifyLocale(req.body?.locale)
    const role = req.session!.role

    if (!returnPath || !isAllowedEmailVerifyReturnPath(returnPath, role)) {
      return fail(res, 'Invalid return path')
    }

    if (overBudget(res, sessionActionLimiter, `session:${req.session!.userId}`)) return

    const user = await prisma.user.findUnique({
      where: { id: req.session!.userId },
      select: { id: true, email: true, passwordHash: true },
    })
    if (!user) throw new HttpError(404, 'Account not found', 404)

    if (!user.passwordHash) {
      // Their address *is* their Google identity; changing it here would desync
      // `googleId` from `email` with no way to re-prove either.
      return fail(
        res,
        'This account signs in with Google, so its email address cannot be changed here.',
        AUTH_ERROR.googleOnlyAccount
      )
    }
    if (!(await verifyPassword(user.passwordHash, password))) {
      return fail(res, 'Current password is incorrect', AUTH_ERROR.reauthRequired, 401)
    }
    if (email === user.email) return fail(res, 'That is already your email address')

    /**
     * Another account already holds the address. Answered as success with **no send**,
     * rather than the 409 the old phone-change route used: this endpoint is authenticated
     * but a 409 would still make it an email-existence oracle for the price of one account.
     * The address itself is told someone tried.
     */
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (taken) {
      const notice = await sendAlreadyRegisteredNotice(email, locale)
      if (!notice.ok) console.error(`[identity] already-registered notice failed: ${notice.message}`)
      return ok(res, true)
    }

    const token = await issuePendingEmailVerify(user.id, email)
    const verifyUrl = buildEmailVerifyUrl(config.corsOrigin, returnPath, token)

    /**
     * **Surfaced here, unlike registration.** The caller is authenticated, so there is
     * nothing to enumerate, and the pending address is already stored — a silent failure
     * would leave them waiting on a link that was never sent. Retrying re-mints the token,
     * so a visible error is recoverable.
     */
    const sent = await sendVerificationEmail(email, verifyUrl)
    if (!sent.ok) {
      return fail(res, 'We could not send the verification email. Please try again in a moment.', 502, 502)
    }

    // The address being moved *away from* is the only signal the previous owner would see.
    const warning = await sendEmailChangeStartedNotice(user.email, locale)
    if (!warning.ok) console.error(`[identity] email-change notice failed: ${warning.message}`)

    return ok(res, true)
  })
)

/* ================================================================== *
 * DELETE /identity/account
 * ================================================================== */

identityRouter.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (overBudget(res, sessionActionLimiter, `session:${req.session!.userId}`)) return

    const user = await prisma.user.findUnique({
      where: { id: req.session!.userId },
      select: { id: true, passwordHash: true, consumer: { select: { id: true } } },
    })
    if (!user) throw new HttpError(404, 'Account not found', 404)

    /**
     * Re-authentication, because deleting is irreversible and one stolen session must not
     * be enough. A Google-only account has no password to re-enter; it is refused here
     * rather than waved through, and setting a password first (via forgot-password) is the
     * documented route.
     */
    if (!user.passwordHash) {
      return fail(
        res,
        'This account signs in with Google. Set a password first to confirm deletion.',
        AUTH_ERROR.googleOnlyAccount
      )
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!(await verifyPassword(user.passwordHash, password))) {
      return fail(res, 'Current password is incorrect', AUTH_ERROR.reauthRequired, 401)
    }

    /**
     * `Appointment.consumerId` is `onDelete: Restrict` — deliberately, so that nulling it
     * cannot quietly turn someone's appointments into guest bookings with no contact
     * details. So a Consumer with appointments cannot be deleted, and this pre-counts and
     * answers 409 rather than letting Prisma's foreign-key error surface as a 500
     * (`middleware/error.ts` maps only P2025 and P2002).
     */
    if (user.consumer) {
      const appointments = await prisma.appointment.count({ where: { consumerId: user.consumer.id } })
      if (appointments > 0) {
        return fail(
          res,
          'You have appointments on record. Cancel them before deleting your account.',
          AUTH_ERROR.hasAppointments,
          409
        )
      }
    }

    // Provider, Consumer and their children all cascade from User.
    await prisma.user.delete({ where: { id: user.id } })
    clearSessionCookie(res)
    return ok(res, true)
  })
)
