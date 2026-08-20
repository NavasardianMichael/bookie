import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { fail } from '../lib/api-response.js'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = -1
  ) {
    super(message)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return fail(res, err.message, err.code, err.status)
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return fail(res, 'Not found', 404, 404)
    if (err.code === 'P2002') return fail(res, 'Conflict', 409, 409)
  }

  console.error(err)
  return fail(res, 'Internal server error', -1, 500)
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}
