import { Router } from 'express'
import { config } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import {
  buildEmailVerifyUrl,
  emailVerifyTokensMatch,
  isAllowedEmailVerifyReturnPath,
  issuePendingEmailVerify,
  sendVerificationEmail,
} from '../lib/email-verify.js'
import { issueOtp, issuePendingPhoneOtp, validateOtp, verifyOtp } from '../lib/otp.js'
import { prisma } from '../lib/prisma.js'
import { asTrimmedString, isEmail } from '../lib/request.js'
import { clearSessionCookie, setSessionCookie } from '../lib/session.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'

export const identityRouter = Router()

type RegistrationProfile = {
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
 * Canada and ~20 more.
 */
const asCountryCode = (value: unknown): string | undefined => {
  const trimmed = asTrimmedString(value)?.toUpperCase()
  return trimmed && /^[A-Z]{2}$/.test(trimmed) ? trimmed : undefined
}

/**
 * Resolves the provider registration form's Organization field, which is a combobox:
 * an id means an existing organization was picked, a bare name means the provider typed
 * one that may or may not exist yet. Matching is case-insensitive so "Acme Services" and
 * "acme services" do not become two organizations.
 */
const resolveOrganizationId = async (profile: RegistrationProfile): Promise<string | undefined> => {
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

identityRouter.post(
  '/send-otp',
  asyncHandler(async (req, res) => {
    const phone = req.body?.phone
    if (!phone?.code || !phone?.number) {
      return fail(res, 'Phone code and number required')
    }

    await issueOtp(Number(phone.code), BigInt(phone.number))
    return ok(res, true)
  })
)

identityRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { phone, otp, userType, profile } = req.body ?? {}
    if (!phone?.code || !phone?.number || otp === undefined) {
      return fail(res, 'Phone and OTP required')
    }
    if (userType !== undefined && userType !== 'consumer' && userType !== 'provider') {
      return fail(res, 'userType must be consumer or provider')
    }

    const result = await validateOtp(Number(phone.code), BigInt(phone.number), String(otp))
    if (!result.ok) return fail(res, result.reason, 401, 401)

    const [existingProvider, existingConsumer] = await Promise.all([
      prisma.provider.findUnique({ where: { userId: result.userId } }),
      prisma.consumer.findUnique({ where: { userId: result.userId } }),
    ])

    /**
     * `userType` comes from a registration form, which knows the role. Sign-in does not
     * send one — a returning user should not have to restate what they are — so the role is
     * read back off whichever profile already exists. A user with both (possible: the
     * relations are independent) resolves to provider, the account with more to manage.
     */
    const role: 'consumer' | 'provider' | undefined =
      userType ?? (existingProvider ? 'provider' : existingConsumer ? 'consumer' : undefined)

    if (!role) {
      return fail(res, 'No account exists for this number. Please register first.', 404, 404)
    }

    const registration: RegistrationProfile = profile ?? {}
    const firstName = asTrimmedString(registration.firstName)
    const lastName = asTrimmedString(registration.lastName)
    const email = asTrimmedString(registration.email)
    const country = asCountryCode(registration.country)

    let profileId: string
    let isNewUser: boolean

    if (role === 'provider') {
      isNewUser = !existingProvider

      if (existingProvider) {
        profileId = existingProvider.id
      } else {
        // Registration fields are applied on create only — a returning provider signing in
        // again must never have their profile overwritten by a stale draft.
        const created = await prisma.provider.create({
          data: {
            userId: result.userId,
            firstName: firstName ?? 'New',
            lastName: lastName ?? 'Provider',
            email,
            country,
            organizationId: await resolveOrganizationId(registration),
            weekSchedule: {},
            listed: false,
          },
        })
        profileId = created.id
      }
    } else {
      isNewUser = !existingConsumer

      if (existingConsumer) {
        profileId = existingConsumer.id
      } else {
        const created = await prisma.consumer.create({
          data: {
            userId: result.userId,
            firstName: firstName ?? 'New',
            lastName: lastName ?? 'Consumer',
            email,
            country,
          },
        })
        profileId = created.id
      }
    }

    setSessionCookie(res, { userId: result.userId, role, profileId })
    return ok(res, { role, profileId, isNewUser })
  })
)

/**
 * Lets the client recover its own role and profile id after a refresh — the session lives
 * in an httpOnly cookie the browser cannot read. Also returns display fields so the
 * Header avatar does not need a second profile fetch.
 */
identityRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role, profileId, userId } = req.session!

    if (role === 'provider') {
      const provider = await prisma.provider.findUnique({ where: { id: profileId } })
      if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
      return ok(res, {
        role,
        profileId,
        userId,
        firstName: provider.firstName,
        lastName: provider.lastName,
        image: provider.imageUrl ?? undefined,
      })
    }

    const consumer = await prisma.consumer.findUnique({ where: { id: profileId } })
    if (!consumer) throw new HttpError(404, 'Consumer profile not found', 404)
    return ok(res, {
      role,
      profileId,
      userId,
      firstName: consumer.firstName,
      lastName: consumer.lastName,
    })
  })
)

identityRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res)
    return ok(res, true)
  })
)

identityRouter.post(
  '/change-phone/send-otp',
  requireAuth,
  asyncHandler(async (req, res) => {
    const phone = req.body?.phone
    if (!phone?.code || !phone?.number) {
      return fail(res, 'Phone code and number required')
    }

    const phoneCode = Number(phone.code)
    const phoneNumber = BigInt(phone.number)

    const taken = await prisma.user.findUnique({
      where: { phoneCode_phoneNumber: { phoneCode, phoneNumber } },
    })
    if (taken && taken.id !== req.session!.userId) {
      return fail(res, 'Phone number already in use', 409, 409)
    }

    await issuePendingPhoneOtp(req.session!.userId, phoneCode, phoneNumber)
    return ok(res, true)
  })
)

identityRouter.post(
  '/change-phone/confirm',
  requireAuth,
  asyncHandler(async (req, res) => {
    const otp = req.body?.otp
    if (otp === undefined) return fail(res, 'OTP required')

    const user = await prisma.user.findUnique({ where: { id: req.session!.userId } })
    if (!user?.pendingPhoneOtpHash || user.pendingPhoneCode === null || user.pendingPhoneNumber === null) {
      return fail(res, 'Phone change not requested', 400, 400)
    }
    if (user.pendingPhoneOtpExpiresAt && user.pendingPhoneOtpExpiresAt < new Date()) {
      return fail(res, 'OTP expired', 401, 401)
    }

    const valid = await verifyOtp(String(otp), user.pendingPhoneOtpHash)
    if (!valid) return fail(res, 'Invalid OTP', 401, 401)

    const phoneCode = user.pendingPhoneCode
    const phoneNumber = user.pendingPhoneNumber

    const taken = await prisma.user.findUnique({
      where: { phoneCode_phoneNumber: { phoneCode, phoneNumber } },
    })
    if (taken && taken.id !== user.id) {
      return fail(res, 'Phone number already in use', 409, 409)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneCode,
        phoneNumber,
        pendingPhoneCode: null,
        pendingPhoneNumber: null,
        pendingPhoneOtpHash: null,
        pendingPhoneOtpExpiresAt: null,
      },
    })

    return ok(res, {
      phone: { code: phoneCode, number: Number(phoneNumber) },
    })
  })
)

identityRouter.post(
  '/change-email/send',
  requireAuth,
  asyncHandler(async (req, res) => {
    const email = asTrimmedString(req.body?.email)?.toLowerCase()
    if (!email || !isEmail(email)) {
      return fail(res, 'Valid email required')
    }

    const returnPath = asTrimmedString(req.body?.returnPath)
    const role = req.session!.role
    if (!returnPath || !isAllowedEmailVerifyReturnPath(returnPath, role)) {
      return fail(res, 'Invalid return path')
    }

    const token = await issuePendingEmailVerify(req.session!.userId, email)
    const verifyUrl = buildEmailVerifyUrl(config.corsOrigin, returnPath, token)

    // Reported rather than swallowed: the pending address is already stored, so a silent
    // failure would leave the user waiting on a link that was never sent. Retrying the
    // route re-mints the token, so a visible error is recoverable.
    const sent = await sendVerificationEmail(email, verifyUrl)
    if (!sent.ok) {
      return fail(res, 'We could not send the verification email. Please try again in a moment.', 502, 502)
    }

    return ok(res, true)
  })
)

identityRouter.post(
  '/change-email/confirm',
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = asTrimmedString(req.body?.token)
    if (!token) return fail(res, 'Verification token required')

    const user = await prisma.user.findUnique({ where: { id: req.session!.userId } })
    if (!user?.emailOtpHash || !user.pendingEmail) {
      return fail(res, 'Email change not requested', 400, 400)
    }
    if (user.emailOtpExpiresAt && user.emailOtpExpiresAt < new Date()) {
      return fail(res, 'Verification link expired', 401, 401)
    }

    if (!emailVerifyTokensMatch(token, user.emailOtpHash)) {
      return fail(res, 'Invalid verification link', 401, 401)
    }

    const email = user.pendingEmail
    const verifiedAt = new Date()

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          pendingEmail: null,
          emailOtpHash: null,
          emailOtpExpiresAt: null,
        },
      }),
      req.session!.role === 'provider'
        ? prisma.provider.update({
            where: { id: req.session!.profileId },
            data: { email, emailVerifiedAt: verifiedAt },
          })
        : prisma.consumer.update({
            where: { id: req.session!.profileId },
            data: { email, emailVerifiedAt: verifiedAt },
          }),
    ])

    return ok(res, { email, emailVerifiedAt: verifiedAt.toISOString() })
  })
)
