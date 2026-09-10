import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

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
