import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * One-time URL tokens: the value that travels in an emailed link.
 *
 * Extracted from `lib/email-verify.ts`, which had the only implementation, so the
 * password-reset flow reuses it instead of growing a second, subtly different one. Both
 * flows store `hashUrlToken(token)` and email the raw value — the raw token is never
 * persisted, so a database read does not yield a working link.
 *
 * This module imports nothing but `node:crypto`, which keeps it reachable from
 * `tests/unit/server/` (see `tests/CLAUDE.md`).
 */

/** 32 random bytes, hex-encoded. 256 bits — collision and guessing are both out of reach. */
export const mintUrlToken = (): string => randomBytes(32).toString('hex')

export const hashUrlToken = (token: string): string => createHash('sha256').update(token).digest('hex')

/**
 * Constant-time comparison of a supplied token against a stored hash.
 *
 * `timingSafeEqual` throws on a length mismatch rather than returning false, so the
 * length is checked first — a caller-supplied token of the wrong length must be a plain
 * `false`, not an exception.
 */
export const urlTokensMatch = (token: string, storedHash: string): boolean => {
  const actual = Buffer.from(hashUrlToken(token))
  const expected = Buffer.from(storedHash)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

/**
 * Reconstructable capability token for a signed-in consumer's own booking list.
 *
 * The emailed manage URL stores only `sha256(raw)`, so the raw value cannot be
 * recovered on `GET /appointments`. This HMAC is derived from the appointment id
 * and the same secret that signs sessions, so the list can mint a `/b/<token>`
 * that `GET`/`PATCH /appointments/manage/:token` also accepts — without rotating
 * the emailed token or persisting a second secret.
 *
 * `secret` is passed in so this file stays `node:crypto`-only and unit-testable.
 */
const OWNER_MANAGE_PREFIX = 'own.'

const hmacHex = (secret: string, value: string): string => createHmac('sha256', secret).update(value).digest('hex')

const timingSafeHexEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export const isOwnerManageToken = (token: string): boolean => token.startsWith(OWNER_MANAGE_PREFIX)

export const mintOwnerManageToken = (appointmentId: string, secret: string): string =>
  `${OWNER_MANAGE_PREFIX}${appointmentId}.${hmacHex(secret, `appointment-manage:${appointmentId}`)}`

export const readOwnerManageAppointmentId = (token: string, secret: string): string | null => {
  if (!isOwnerManageToken(token)) return null
  const rest = token.slice(OWNER_MANAGE_PREFIX.length)
  const dot = rest.lastIndexOf('.')
  if (dot <= 0) return null
  const appointmentId = rest.slice(0, dot)
  const mac = rest.slice(dot + 1)
  const expected = hmacHex(secret, `appointment-manage:${appointmentId}`)
  if (!timingSafeHexEqual(mac, expected)) return null
  return appointmentId
}
