import { Router } from 'express'
import { fail, ok } from '../lib/api-response.js'
import { issueOtp, validateOtp } from '../lib/otp.js'
import { prisma } from '../lib/prisma.js'
import { clearSessionCookie, setSessionCookie } from '../lib/session.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

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

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
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
 * in an httpOnly cookie the browser cannot read.
 */
identityRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role, profileId } = req.session!
    return ok(res, { role, profileId })
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
