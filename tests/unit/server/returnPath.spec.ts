import { describe, expect, it } from 'vitest'
import { LANG_PARAM, LOCALES } from '@i18n/config'
// The one aliased import here, and the point of the last describe block: the web constant is
// the *consumer* of what this module mints, and only a test that holds both can catch them
// drifting apart.
import { EMAIL_VERIFY_QUERY as WEB_EMAIL_VERIFY_QUERY, GOOGLE_SIGN_UP_QUERY as WEB_GOOGLE_SIGN_UP_QUERY } from '@constants/auth'
import { ROUTES } from '@constants/routes'
// Relative, not aliased: `server/` is a separate package. This module imports only
// `lib/request.ts`, which imports nothing — which is what keeps it reachable here at all,
// and is the stated reason it was split out of `lib/email-verify.ts`.
import {
  asVerifyLocale,
  buildEmailVerifyUrl,
  buildProviderPageUrl,
  DEFAULT_VERIFY_LOCALE,
  EMAIL_VERIFY_QUERY,
  GOOGLE_SIGN_UP_PATHS,
  GOOGLE_SIGN_UP_QUERY,
  googleSignUpPath,
  isAllowedEmailVerifyReturnPath,
  isAllowedPublicReturnPath,
  PROVIDER_PAGE_PATH,
  splitLocalePath,
} from '../../../server/src/lib/return-path'

/**
 * These four functions are the **open-redirect guards** for every link this server mints —
 * verification, password reset, and the Google OAuth flow's return path. Each one takes a
 * request-supplied string and decides where a browser is allowed to land.
 *
 * They are pure and dependency-free, so the hostile inputs can be enumerated exhaustively
 * here rather than reasoned about at each of the call sites.
 */
describe('splitLocalePath', () => {
  it('splits a plain site-relative path', () => {
    expect(splitLocalePath('/en/auth/sign-in')).toEqual({ locale: 'en', rest: 'auth/sign-in' })
  })

  it('keeps a region subtag intact', () => {
    expect(splitLocalePath('/pt-BR/auth/verify-email')).toEqual({ locale: 'pt-BR', rest: 'auth/verify-email' })
  })

  it('accepts a bare locale root', () => {
    expect(splitLocalePath('/de')).toEqual({ locale: 'de', rest: '' })
  })

  // The prefix tests are the cheap guard, and they matter independently of the locale
  // allowlist: a naive `startsWith('/')` check passes every one of these.
  it.each([
    ['protocol-relative absolute URL', '//evil.com/pwn'],
    ['backslash form some browsers normalise to //', '/\\evil.com'],
    ['backslash anywhere in the path', '/en/auth\\evil'],
    ['absolute http URL', 'http://evil.com'],
    ['absolute https URL', 'https://evil.com'],
    ['a path that is not site-relative at all', 'en/auth/sign-in'],
    ['empty string', ''],
  ])('rejects a %s', (_label, input) => {
    expect(splitLocalePath(input)).toBeNull()
  })

  // Refused outright because every caller appends its own token parameter — a path
  // arriving with one already is either a mistake or an attempt to smuggle a second value
  // past `URL.searchParams.set`.
  it.each([
    ['query string', '/en/auth/sign-in?next=//evil.com'],
    ['fragment', '/en/auth/sign-in#/../../evil'],
  ])('rejects a path carrying a %s', (_label, input) => {
    expect(splitLocalePath(input)).toBeNull()
  })

  it('rejects a locale that is not one of the 16', () => {
    expect(splitLocalePath('/xx/auth/sign-in')).toBeNull()
    // `pt-PT` and `zh-TW` are deliberately not locales this app ships.
    expect(splitLocalePath('/pt-PT/auth/sign-in')).toBeNull()
    expect(splitLocalePath('/zh-TW/auth/sign-in')).toBeNull()
  })

  it('rejects a path with no locale segment', () => {
    expect(splitLocalePath('/auth/sign-in')).toBeNull()
  })

  it('is case-sensitive on the locale, matching the routing table', () => {
    expect(splitLocalePath('/EN/auth/sign-in')).toBeNull()
    expect(splitLocalePath('/pt-br/auth/verify-email')).toBeNull()
  })
})

describe('isAllowedEmailVerifyReturnPath', () => {
  it('allows either settings profile, in any locale', () => {
    expect(isAllowedEmailVerifyReturnPath('/en/providers/profile')).toBe(true)
    expect(isAllowedEmailVerifyReturnPath('/hy/consumers/profile')).toBe(true)
    expect(isAllowedEmailVerifyReturnPath('/pt-BR/consumers/profile')).toBe(true)
  })

  /**
   * It used to take the caller's `role` and accept only that side's page. That was never
   * what stopped an open redirect — `splitLocalePath` is — and it became a live bug once
   * the settings shell gained its workspace switch: a provider who holds a Consumer
   * profile changes their email from `/consumers/profile` while their session still reads
   * `provider`, and the send answered "Invalid return path".
   */
  it('does not care which role the caller holds', () => {
    expect(isAllowedEmailVerifyReturnPath('/en/consumers/profile')).toBe(true)
    expect(isAllowedEmailVerifyReturnPath('/en/providers/profile')).toBe(true)
  })

  // Still exactly two destinations. A nested tab is not one of them.
  it('refuses any other path, including a nested tab', () => {
    expect(isAllowedEmailVerifyReturnPath('/en/providers/profile/seo')).toBe(false)
    expect(isAllowedEmailVerifyReturnPath('/en/consumers/profile/notifications')).toBe(false)
    expect(isAllowedEmailVerifyReturnPath('/en/providers')).toBe(false)
  })

  // The guard that actually matters, and the one dropping the role did not touch.
  it('refuses an off-site target', () => {
    expect(isAllowedEmailVerifyReturnPath('//evil.com/providers/profile')).toBe(false)
    expect(isAllowedEmailVerifyReturnPath('https://evil.com/en/providers/profile')).toBe(false)
    expect(isAllowedEmailVerifyReturnPath('/en/providers/profile@evil.com')).toBe(false)
  })
})

describe('isAllowedPublicReturnPath', () => {
  // These four are reachable with **no session** — signup verification, password reset,
  // and the Google flow's landing page. Keep in step with `src/constants/routes.ts`.
  it.each([
    'auth/verify-email',
    'auth/reset-password',
    'auth/sign-in',
    'auth/callback',
  ])('allows /en/%s', (rest) => {
    expect(isAllowedPublicReturnPath(`/en/${rest}`)).toBe(true)
  })

  it('allows them under any shipped locale', () => {
    expect(isAllowedPublicReturnPath('/ja/auth/callback')).toBe(true)
    expect(isAllowedPublicReturnPath('/pt-BR/auth/reset-password')).toBe(true)
  })

  it('refuses a signed-in area', () => {
    expect(isAllowedPublicReturnPath('/en/providers/profile')).toBe(false)
    expect(isAllowedPublicReturnPath('/en/consumers/profile')).toBe(false)
  })

  it('refuses a path outside the allowlist', () => {
    expect(isAllowedPublicReturnPath('/en/auth/logout')).toBe(false)
    expect(isAllowedPublicReturnPath('/en/')).toBe(false)
  })

  // The case that matters most: this is what stops `GET /identity/google?returnPath=…`
  // from bouncing a browser off-site carrying a `?error=` or a fresh session cookie.
  it.each(['//evil.com/auth/sign-in', 'https://evil.com/auth/sign-in', '/\\evil.com/auth/sign-in'])(
    'refuses the off-site target %s',
    (input) => {
      expect(isAllowedPublicReturnPath(input)).toBe(false)
    }
  )
})

describe('asVerifyLocale', () => {
  it('passes a shipped locale through', () => {
    expect(asVerifyLocale('de')).toBe('de')
    expect(asVerifyLocale('zh-CN')).toBe('zh-CN')
  })

  it('trims before matching', () => {
    expect(asVerifyLocale('  fr  ')).toBe('fr')
  })

  /**
   * `server/` cannot import `src/`, so `VERIFY_LOCALES` is a hand-kept twin of `LOCALES`.
   * A locale missing here still renders the web app, but every emailed link for it lands on
   * English — nothing else fails, so this is the only place the omission shows.
   */
  it.each([...LOCALES])('accepts the web locale %s', (locale) => {
    expect(asVerifyLocale(locale)).toBe(locale)
    expect(splitLocalePath(`/${locale}/auth/sign-in`)?.locale).toBe(locale)
  })

  // Never throws and never echoes the input: the result is interpolated straight into a
  // URL path, so an unknown value has to collapse to the default rather than travel.
  it.each([
    ['an unshipped locale', 'xx'],
    ['a near-miss region', 'pt-PT'],
    ['a path traversal attempt', '../../evil'],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a number', 42],
    ['null', null],
    ['undefined', undefined],
    ['an object', { locale: 'en' }],
  ])('falls back to the default for %s', (_label, input) => {
    expect(asVerifyLocale(input)).toBe(DEFAULT_VERIFY_LOCALE)
  })
})

/**
 * The link builder, and the contract it has with the page that reads the link.
 *
 * This block exists because the contract broke in production and nothing failed: the server
 * minted `?verifyEmail=`, `src/app/[lang]/auth/verify-email/page.tsx` read `?token=`, and so
 * every confirmation link arrived tokenless. Both sides typechecked, both had tests, and the
 * page answered a valid link with "we could not confirm this email" — the failure mode of a
 * mismatch is indistinguishable from an expired token, which is what made it survive.
 */
describe('buildEmailVerifyUrl', () => {
  const ORIGIN = 'https://bookie.example.com'
  const TOKEN = 'a-token'

  it('puts the token on the return path under the agreed param', () => {
    expect(buildEmailVerifyUrl(ORIGIN, '/en/auth/verify-email', TOKEN)).toBe(
      `${ORIGIN}/en/auth/verify-email?${EMAIL_VERIFY_QUERY}=${TOKEN}`,
    )
  })

  // The signup link and the change-email link are built by this one function, so the param
  // is the same on both and the two reading pages cannot diverge from each other.
  it('uses the same param for the change-email return path', () => {
    expect(buildEmailVerifyUrl(ORIGIN, '/fr/providers/profile', TOKEN)).toBe(
      `${ORIGIN}/fr/providers/profile?${EMAIL_VERIFY_QUERY}=${TOKEN}`,
    )
  })

  it('tolerates a trailing slash on the origin rather than swallowing the path', () => {
    expect(buildEmailVerifyUrl(`${ORIGIN}/`, '/en/auth/verify-email', TOKEN)).toBe(
      `${ORIGIN}/en/auth/verify-email?${EMAIL_VERIFY_QUERY}=${TOKEN}`,
    )
  })

  it('percent-encodes the token instead of emitting it raw', () => {
    const url = new URL(buildEmailVerifyUrl(ORIGIN, '/en/auth/verify-email', 'a b&c=d'))
    expect(url.searchParams.get(EMAIL_VERIFY_QUERY)).toBe('a b&c=d')
  })

  // The assertion that would have caught the outage. Renaming either constant alone fails
  // here rather than in a user's inbox.
  it('mints the param name the web app reads', () => {
    expect(EMAIL_VERIFY_QUERY).toBe(WEB_EMAIL_VERIFY_QUERY)
  })
})

/**
 * The Google callback's redirect for a first-time account, built on the server and read by
 * the web app. Nothing else ties the two spellings together: a rename on either side alone
 * lands a new Google account on a 404, or on a form asking for a password it does not have.
 */
describe('googleSignUpPath', () => {
  it('opens the registration form for the role the flow started from', () => {
    expect(googleSignUpPath('en', 'consumer')).toBe(`/en${ROUTES.consumerRegistration}`)
    expect(googleSignUpPath('fr', 'provider')).toBe(`/fr${ROUTES.providerRegistration}`)
  })

  it('opens the account-type choice when no role was chosen yet', () => {
    expect(googleSignUpPath('hy', null)).toBe(`/hy${ROUTES.accountTypeSelection}`)
  })

  it('names the pages and the param the web app reads', () => {
    expect(GOOGLE_SIGN_UP_PATHS).toEqual({
      consumer: ROUTES.consumerRegistration,
      provider: ROUTES.providerRegistration,
      unknown: ROUTES.accountTypeSelection,
    })
    expect(GOOGLE_SIGN_UP_QUERY).toBe(WEB_GOOGLE_SIGN_UP_QUERY)
  })
})

/**
 * The link a declined or cancelled booker gets back to the provider's page. The page is
 * `/p/<key>` with the language as a query parameter (`src/proxy.ts`), so a locale-prefixed
 * link would cost every recipient a redirect — and a different route name would 404.
 */
describe('buildProviderPageUrl', () => {
  it('points at the page route the web app serves', () => {
    expect(PROVIDER_PAGE_PATH).toBe(ROUTES.providerPage)
  })

  it('carries the language as the query parameter the proxy reads', () => {
    expect(buildProviderPageUrl('https://bookie.example', 'hy', 'acme-hair')).toBe(
      `https://bookie.example/p/acme-hair?${LANG_PARAM}=hy`
    )
  })

  it('tolerates a trailing slash on the origin and encodes the key', () => {
    expect(buildProviderPageUrl('https://bookie.example/', 'en', 'a/b')).toBe('https://bookie.example/p/a%2Fb?lang=en')
  })
})
