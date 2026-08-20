import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'
import { config } from '../config.js'

const DEV_OTP = config.devOtpBypass

export async function hashOtp(code: string) {
  return bcrypt.hash(code, 10)
}

export async function verifyOtp(code: string, hash: string | null | undefined) {
  if (!hash) return false
  if (config.nodeEnv !== 'production' && code === DEV_OTP) return true
  return bcrypt.compare(code, hash)
}

export async function issueOtp(phoneCode: number, phoneNumber: bigint) {
  const code =
    config.nodeEnv !== 'production'
      ? DEV_OTP
      : String(Math.floor(100000 + Math.random() * 900000))

  const otpHash = await hashOtp(code)
  const otpExpiresAt = new Date(Date.now() + config.otpTtlMs)

  await prisma.user.upsert({
    where: { phoneCode_phoneNumber: { phoneCode, phoneNumber } },
    create: { phoneCode, phoneNumber, otpHash, otpExpiresAt },
    update: { otpHash, otpExpiresAt },
  })

  if (config.nodeEnv !== 'production') {
    console.log(`[OTP] +${phoneCode}${phoneNumber} => ${code}`)
  }

  return true
}

export async function validateOtp(phoneCode: number, phoneNumber: bigint, otp: string) {
  const user = await prisma.user.findUnique({
    where: { phoneCode_phoneNumber: { phoneCode, phoneNumber } },
  })

  if (!user?.otpHash) return { ok: false as const, reason: 'OTP not requested' }

  if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
    return { ok: false as const, reason: 'OTP expired' }
  }

  const valid = await verifyOtp(otp, user.otpHash)
  if (!valid) return { ok: false as const, reason: 'Invalid OTP' }

  await prisma.user.update({
    where: { id: user.id },
    data: { otpHash: null, otpExpiresAt: null },
  })

  return { ok: true as const, userId: user.id }
}
