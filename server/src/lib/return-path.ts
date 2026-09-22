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
 * The two settings homes an email-verification link may land on.
 *
 * Keep in step with `ROUTES.providerProfile` / `ROUTES.consumerProfile`; the locale
 * prefix is stripped by `splitLocalePath` before the comparison.
 */
const SETTINGS_RETURN_PATHS = new Set(['providers/profile', 'consumers/profile'])

/**
 * The link must land on a settings profile of ours, never an open redirect.
 *
 * It used to take the caller's `role` and accept only that side's page. That was never
 * the open-redirect guard — `splitLocalePath` is, by refusing anything that is not a
 * plain site-relative path — and once the settings shell gained its workspace switch the
 * narrowing became a live bug: a provider who holds a Consumer profile and opens their
 * own consumer settings sends `/{locale}/consumers/profile`, while their session still
 * reads `provider`, so changing their email answered **"Invalid return path"**.
 *
 * Dropping the role is not a widening worth worrying about. Both destinations are our
 * own authenticated settings pages, and landing on the one the account does not hold is
 * answered by the layout's own guard — not by a stranger receiving anything. What the
 * link carries is a token for the address its recipient just proved they control, and
 * where it lands cannot change that.
 */
export const isAllowedEmailVerifyReturnPath = (returnPath: string): boolean => {
  const parsed = splitLocalePath(returnPath)
  return Boolean(parsed && SETTINGS_RETURN_PATHS.has(parsed.rest))
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

/**
 * Query param **every** link this server mints for email verification carries — the signup
 * link that lands on `/{locale}/auth/verify-email` and the change-email link that lands on
 * the caller's own profile alike. One name for one token: the page reading it mirrors this
 * as `EMAIL_VERIFY_QUERY` in `src/constants/auth.ts`, and `tests/unit/server/returnPath.spec.ts`
 * pins the two together, because a rename on one side alone fails silently — the page simply
 * reads `undefined` and tells the visitor their link expired.
 */
export const EMAIL_VERIFY_QUERY = 'verifyEmail'

/**
 * Composes the emailed link. Lives here rather than in `lib/email-verify.ts` for the same
 * reason the guards above do: that module imports config, Prisma and the mail client, which
 * would put this out of reach of `tests/unit/server/`.
 */
export const buildEmailVerifyUrl = (origin: string, returnPath: string, token: string): string => {
  const url = new URL(returnPath, origin.endsWith('/') ? origin : `${origin}/`)
  url.searchParams.set(EMAIL_VERIFY_QUERY, token)
  return url.toString()
}

/**
 * The provider's approvals queue — where the "a booking is waiting for your approval"
 * email sends them.
 *
 * Here rather than in `lib/booking-mail.ts` for the reason this whole module exists: the
 * page at the other end is `src/app/[lang]/providers/(account)/profile/approvals`, named
 * by `ROUTES.providerProfileApprovals`, and the two halves share no type. `booking-mail.ts`
 * imports config and the mail client, so no unit test can reach into it; this file imports
 * only `request.ts`, so `tests/unit/server/bookingErrors.spec.ts` can hold both constants
 * at once and fail when either is renamed alone. See `server/CLAUDE.md`.
 *
 * **Locale-free**, exactly as `ROUTES` is — the prefix is added by the builder below and
 * by `AppLink` on the web side, never written into the constant.
 */
export const PROVIDER_APPROVALS_PATH = '/providers/profile/approvals'

const withLocale = (origin: string, locale: string, path: string): string =>
  new URL(`/${locale}${path}`, origin.endsWith('/') ? origin : `${origin}/`).toString()

export const buildApprovalsUrl = (origin: string, locale: string): string =>
  withLocale(origin, locale, PROVIDER_APPROVALS_PATH)

/** The provider's public page — where a declined booker goes to pick another time. */
export const buildProviderPageUrl = (origin: string, locale: string, providerId: string): string =>
  withLocale(origin, locale, `/providers/${providerId}`)
