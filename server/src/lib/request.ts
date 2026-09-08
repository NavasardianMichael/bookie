/**
 * Body-reading helpers shared by the routers.
 *
 * This server carries no schema validator, so every route hand-reads `req.body`.
 * These are the shapes that were being re-derived per route — `asTrimmedString`
 * lived privately in `routes/identity.ts` until `routes/contact.ts` needed it too.
 */

/** `undefined` for anything that is not a non-empty string once trimmed. */
export const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

/**
 * Trimmed, then capped — for free text going into a column with no length constraint.
 *
 * Truncating rather than rejecting is deliberate for a long body field: a visitor who
 * pasted 40KB into a message box wants the message sent, not a validation error. Reject
 * where the length itself is the signal (an email address), cap where it is not.
 */
export const asBoundedString = (value: unknown, max: number): string | undefined =>
  asTrimmedString(value)?.slice(0, max)

/** RFC 5321's limit on a full address. Also the backtracking bound for `isEmail`. */
export const MAX_EMAIL_LENGTH = 254

/**
 * Shape check only, deliberately not RFC 5322 — an address is proven by the
 * verification link, and a stricter pattern only rejects real addresses.
 *
 * The length test runs **first** so the regex can never see an unbounded string:
 * `[^\s@]+\.[^\s@]+` is ambiguous (a dot matches `[^\s@]` too), so a long
 * non-matching input would otherwise be a backtracking cost paid per request.
 */
export const isEmail = (value: string): boolean =>
  value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
