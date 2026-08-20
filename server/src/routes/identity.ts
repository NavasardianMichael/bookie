import { Router } from 'express'
import { fail, ok } from '../lib/api-response.js'
import { issueOtp, validateOtp } from '../lib/otp.js'
import { prisma } from '../lib/prisma.js'
import { clearSessionCookie, setSessionCookie } from '../lib/session.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

export const identityRouter = Router()

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
    const { phone, otp, userType } = req.body ?? {}
    if (!phone?.code || !phone?.number || otp === undefined) {
      return fail(res, 'Phone and OTP required')
    }
    if (userType !== 'consumer' && userType !== 'provider') {
      return fail(res, 'userType must be consumer or provider')
    }

    const result = await validateOtp(Number(phone.code), BigInt(phone.number), String(otp))
    if (!result.ok) return fail(res, result.reason, 401, 401)

    let profileId: string

    if (userType === 'provider') {
      let provider = await prisma.provider.findUnique({ where: { userId: result.userId } })
      if (!provider) {
        provider = await prisma.provider.create({
          data: {
            userId: result.userId,
            firstName: 'New',
            lastName: 'Provider',
            weekSchedule: {},
          },
        })
      }
      profileId = provider.id
    } else {
      let consumer = await prisma.consumer.findUnique({ where: { userId: result.userId } })
      if (!consumer) {
        consumer = await prisma.consumer.create({
          data: {
            userId: result.userId,
            name: 'New Consumer',
          },
        })
      }
      profileId = consumer.id
    }

    setSessionCookie(res, { userId: result.userId, role: userType, profileId })
    return ok(res, true)
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
