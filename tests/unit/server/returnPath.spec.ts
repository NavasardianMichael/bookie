import { describe, expect, it } from 'vitest'
// The one aliased import here, and the point of the last describe block: the web constant is
// the *consumer* of what this module mints, and only a test that holds both can catch them
// drifting apart.
import { EMAIL_VERIFY_QUERY as WEB_EMAIL_VERIFY_QUERY } from '@constants/auth'
// Relative, not aliased: `server/` is a separate package. This module imports only
// `lib/request.ts`, which imports nothing — which is what keeps it reachable here at all,
// and is the stated reason it was split out of `lib/email-verify.ts`.
import {
  asVerifyLocale,
  buildEmailVerifyUrl,
  DEFAULT_VERIFY_LOCALE,
  EMAIL_VERIFY_QUERY,
  isAllowedEmailVerifyReturnPath,
  isAllowedPublicReturnPath,
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

  it('rejects a locale that is not one of the 15', () => {
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
  it('allows each role its own settings profile', () => {
    expect(isAllowedEmailVerifyReturnPath('/en/providers/profile', 'provider')).toBe(true)
    expect(isAllowedEmailVerifyReturnPath('/hy/consumers/profile', 'consumer')).toBe(true)
  })

  // The link lands with a live session, so the one thing it must never do is send a
  // verified address to the *other* role's area.
  it("refuses the other role's profile", () => {
    expect(isAllowedEmailVerifyReturnPath('/en/consumers/profile', 'provider')).toBe(false)
    expect(isAllowedEmailVerifyReturnPath('/en/providers/profile', 'consumer')).toBe(false)
  })

  it('refuses any other path, including a nested tab', () => {
    expect(isAllowedEmailVerifyReturnPath('/en/providers/profile/seo', 'provider')).toBe(false)
    expect(isAllowedEmailVerifyReturnPath('/en/providers', 'provider')).toBe(false)
  })

  it('refuses an off-site target', () => {
    expect(isAllowedEmailVerifyReturnPath('//evil.com/providers/profile', 'provider')).toBe(false)
  })
})

describe('isAllowedPublicReturnPath', () => {
  // These five are reachable with **no session** — signup verification, password reset,
  // and the Google flow's landing pages. Keep in step with `src/constants/routes.ts`.
  it.each([
    'auth/verify-email',
    'auth/reset-password',
    'auth/sign-in',
    'auth/callback',
    'auth/complete-registration',
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
