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
 * Every way of not getting an answer from Gemini, as the client should hear it, with Google's
 * suggested wait on a `429`. A refused or empty answer is `unreadable`, the one case where
 * different input — not another try — is the fix. `null` for anything that is not a
 * `GeminiError`. Header-free, so a streamed answer that already sent its headers can report it
 * as an event (`routes/assistant.ts`).
 */
export const describeGeminiFailure = (
  error: unknown,
  copy: GeminiErrorCopy
): { error: HttpError; retryAfterSeconds?: number } | null => {
  if (!(error instanceof GeminiError)) return null
  if (error.status === 429) {
    return { error: new HttpError(429, copy.busy, 429), retryAfterSeconds: error.retryAfterSeconds ?? 60 }
  }
  if (error.status === 422 || error.status === 400) {
    return { error: new HttpError(422, copy.unreadable.message, copy.unreadable.code) }
  }
  // A key Google refuses is a misconfiguration this deployment has, not a passing outage.
  if (error.status === 401 || error.status === 403) {
    return { error: new HttpError(503, copy.unavailable.message, copy.unavailable.code) }
  }
  if (error.timedOut) return { error: new HttpError(504, copy.timedOut, 504) }
  return { error: new HttpError(502, copy.failed, 502) }
}

/**
 * `describeGeminiFailure` for a plain JSON answer: sets `Retry-After` on a `429` and returns the
 * error to throw. Anything that is not a `GeminiError` passes through unchanged. Shared by the
 * photo import and the assistants.
 */
export const toGeminiHttpError = (error: unknown, res: Response, copy: GeminiErrorCopy): unknown => {
  const failure = describeGeminiFailure(error, copy)
  if (!failure) return error
  if (failure.retryAfterSeconds !== undefined) res.setHeader('Retry-After', String(failure.retryAfterSeconds))
  return failure.error
}
