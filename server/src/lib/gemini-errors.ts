import type { Response } from 'express'
import { GeminiError } from './gemini.js'
import { HttpError } from '../middleware/error.js'

/** What a feature calls each failure — the status is shared, the words and codes are its own. */
export type GeminiErrorCopy = {
  busy: string
  unreadable: { message: string; code: number }
  unavailable: { message: string; code: number }
  timedOut: string
  failed: string
}

/**
 * Every way of not getting an answer from Gemini, as the client should hear it. Google's own
 * `429` keeps its suggested wait; a refused or empty answer is `unreadable`, the one case where
 * different input — not another try — is the fix. Anything that is not a `GeminiError` passes
 * through unchanged. Shared by the photo import and the profile assistant.
 */
export const toGeminiHttpError = (error: unknown, res: Response, copy: GeminiErrorCopy): unknown => {
  if (!(error instanceof GeminiError)) return error
  if (error.status === 429) {
    res.setHeader('Retry-After', String(error.retryAfterSeconds ?? 60))
    return new HttpError(429, copy.busy, 429)
  }
  if (error.status === 422 || error.status === 400) {
    return new HttpError(422, copy.unreadable.message, copy.unreadable.code)
  }
  // A key Google refuses is a misconfiguration this deployment has, not a passing outage.
  if (error.status === 401 || error.status === 403) {
    return new HttpError(503, copy.unavailable.message, copy.unavailable.code)
  }
  if (error.timedOut) return new HttpError(504, copy.timedOut, 504)
  return new HttpError(502, copy.failed, 502)
}
