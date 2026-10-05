import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verifies a Paddle webhook's `Paddle-Signature` header: `ts=<unix>;h1=<hex>[;h1=<hex>…]`,
 * where each `h1` is HMAC-SHA256 of `"<ts>:<raw body>"` under the notification
 * destination's secret.
 *
 * Ported from regionify's `paymentService.verifyWebhookSignature`, which has run against
 * both Paddle environments. Three details carry over deliberately:
 *
 * - **The raw bytes are signed**, so the payload is concatenated as a `Buffer`, never as a
 *   string — a re-serialised JSON body would differ in whitespace and key order. That is why
 *   `app.ts` mounts the webhook behind `express.raw` ahead of `express.json`.
 * - **Every `h1` and every secret is tried.** During a secret rotation two destinations are
 *   live (`config.paddle.webhookSecrets`), and either may have signed this event.
 *   `secretIndex` above 0 tells the caller to log that rotation is not finished.
 * - **No timestamp window.** Replaying a genuine event is harmless here: the webhook applies
 *   a subscription *snapshot* and ignores anything older than the last one applied
 *   (`services/billing.ts#shouldApplyEvent`), so a replay can only re-assert current state.
 *
 * Imports only `node:crypto`, so `tests/unit/server/billing.spec.ts` reaches it.
 */
export type SignatureVerdict = { ok: true; secretIndex: number } | { ok: false }

const hexEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export const verifyPaddleSignature = (rawBody: Buffer, header: string, secrets: readonly string[]): SignatureVerdict => {
  if (secrets.length === 0) return { ok: false }

  const parts = header.split(';').map((part) => part.trim())
  const ts = parts.find((part) => part.startsWith('ts='))?.slice(3)
  const signatures = parts.filter((part) => part.startsWith('h1=')).map((part) => part.slice(3))
  if (!ts || signatures.length === 0) return { ok: false }

  const signed = Buffer.concat([Buffer.from(`${ts}:`, 'utf8'), rawBody])

  const secretIndex = secrets.findIndex((secret) => {
    const expected = createHmac('sha256', secret).update(signed).digest('hex')
    return signatures.some((signature) => hexEqual(signature, expected))
  })

  return secretIndex === -1 ? { ok: false } : { ok: true, secretIndex }
}

/** Test and tooling helper: the header Paddle would send for this body, secret and time. */
export const signPaddlePayload = (rawBody: Buffer, secret: string, ts: number): string => {
  const signed = Buffer.concat([Buffer.from(`${ts}:`, 'utf8'), rawBody])
  return `ts=${ts};h1=${createHmac('sha256', secret).update(signed).digest('hex')}`
}
