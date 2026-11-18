import type { Response } from 'express'
import type { ApiEnvelope } from './api-response.js'

/**
 * Server-sent events for a streamed answer — the two assistants' replies. The only place an
 * event is written, so the wire shape stays one thing (`src/helpers/sse.ts` reads it):
 *
 * ```
 * event: <name>
 * data: <JSON>
 * ```
 *
 * Every refusal that can be known up front (validation, plan, allowance, rate limit) is thrown
 * **before** `openSse`, so it reaches the client as an ordinary `{ value, error }` envelope with
 * its status. Once the stream is open the status is spent, so a failure is an `error` event
 * whose data is that same envelope plus the status it would have had (`sendSseError`).
 */
export const openSse = (res: Response): void => {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  // nginx buffers proxied responses by default, which would hold every token until the end.
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

export const sendSse = (res: Response, event: string, data: unknown): void => {
  if (res.writableEnded) return
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

/** A failure after the stream opened: the envelope it would have been, with its status. */
export const sendSseError = (
  res: Response,
  failure: { status: number; code: number; message: string; retryAfterSeconds?: number }
): void => {
  const body: ApiEnvelope<null> & { status: number; retryAfterSeconds?: number } = {
    value: null,
    error: { code: failure.code, message: failure.message },
    status: failure.status,
    ...(failure.retryAfterSeconds !== undefined ? { retryAfterSeconds: failure.retryAfterSeconds } : {}),
  }
  sendSse(res, 'error', body)
}
