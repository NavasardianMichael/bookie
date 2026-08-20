import type { Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export type SessionPayload = {
  userId: string
  role: 'consumer' | 'provider'
  profileId: string
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as SessionPayload
  } catch {
    return null
  }
}

export function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = signSession(payload)
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(config.cookieName)
}
