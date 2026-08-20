import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.js'
import { fail } from '../lib/api-response.js'
import { verifySession } from '../lib/session.js'

function readToken(req: Request) {
  return req.cookies?.[config.cookieName] as string | undefined
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req)
  if (token) {
    const session = verifySession(token)
    if (session) req.session = session
  }
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req)
  if (!token) return fail(res, 'Unauthorized', 401, 401)
  const session = verifySession(token)
  if (!session) return fail(res, 'Invalid session', 401, 401)
  req.session = session
  next()
}

export function requireProvider(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.session?.role !== 'provider') return fail(res, 'Provider access required', 403, 403)
    next()
  })
}

export function requireConsumer(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.session?.role !== 'consumer') return fail(res, 'Consumer access required', 403, 403)
    next()
  })
}
