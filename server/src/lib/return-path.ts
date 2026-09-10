import { asTrimmedString } from './request.js'

/**
 * Where an emailed link is allowed to land, and the locale segment it carries.
 *
 * Its own module rather than part of `lib/email-verify.ts` because that file imports
 * config, Prisma and the mail client — and these are the open-redirect guards, which are
 * exactly the code worth exhaustive unit tests. `lib/request.ts` imports nothing, so this
 * module stays reachable from `tests/unit/server/` (see `tests/CLAUDE.md`).
 */

/**
 * Locales are listed rather than matched with a regex so a ReDoS linter cannot fire.
 * **Keep in step with `LOCALES` in `src/i18n/config.ts`.**
 */
const VERIFY_LOCALES = new Set([
  'en',
  'es',
  'pt-BR',
  'fr',
  'it',
  'de',
  'ar',
  'zh-CN',
  'ja',
  'hy',
  'id',
  'ko',
  'uk',
  'pl',
  'th',
])

export const DEFAULT_VERIFY_LOCALE = 'en'

/**
 * Splits `/{locale}/{rest…}`, rejecting anything that is not a plain site-relative path.
 *
 * The prefix tests come first and are the cheap open-redirect guard. `//evil.com` is a
 * protocol-relative absolute URL, and `/\evil.com` is normalised to `//` by some browsers —
 * a naive `startsWith('/')` check passes both. Neither survives the locale lookup either,
 * but rejecting them by shape means the allowlist is not the only thing standing between us
 * and an open redirect. Query and fragment are refused outright: every caller appends its
 * own token parameter, so a path arriving with one already is either a mistake or an
 * attempt to smuggle a second value past `URL.searchParams.set`.
 */
export const splitLocalePath = (returnPath: string): { locale: string; rest: string } | null => {
  if (!returnPath.startsWith('/') || returnPath.startsWith('//')) return null
  if (returnPath.includes('\\') || returnPath.includes('?') || returnPath.includes('#')) return null

  const parts = returnPath.split('/') // ['', locale, ...rest]
  const locale = parts[1]
  if (!locale || !VERIFY_LOCALES.has(locale)) return null

  return { locale, rest: parts.slice(2).join('/') }
}

/**
 * The link must land on the caller's *own* settings profile, never an open redirect.
 * Unchanged behaviour from the original `isAllowedEmailVerifyReturnPath`.
 */
export const isAllowedEmailVerifyReturnPath = (returnPath: string, role: 'provider' | 'consumer'): boolean => {
  const parsed = splitLocalePath(returnPath)
  if (!parsed) return false
  return parsed.rest === (role === 'provider' ? 'providers/profile' : 'consumers/profile')
}

/**
 * Paths a token link may land on with **no session** — signup verification and password
 * reset, whose recipients are by definition not signed in yet.
 *
 * An allowlist rather than a pattern: it is the only open-redirect guard that does not have
 * to be reasoned about. Keep in step with the `/auth/*` entries in `src/constants/routes.ts`.
 */
const PUBLIC_RETURN_PATHS = new Set([
  'auth/verify-email',
  'auth/reset-password',
  'auth/sign-in',
  'auth/callback',
  'auth/complete-registration',
])

export const isAllowedPublicReturnPath = (returnPath: string): boolean => {
  const parsed = splitLocalePath(returnPath)
  return Boolean(parsed && PUBLIC_RETURN_PATHS.has(parsed.rest))
}

/**
 * Narrows a request-supplied locale to the same list.
 *
 * Signup verification and password reset take a *locale* rather than a `returnPath` and let
 * the server compose the path itself — so on the two highest-volume links the open-redirect
 * surface does not exist at all, rather than being guarded.
 */
export const asVerifyLocale = (value: unknown): string => {
  const trimmed = asTrimmedString(value)
  return trimmed && VERIFY_LOCALES.has(trimmed) ? trimmed : DEFAULT_VERIFY_LOCALE
}
