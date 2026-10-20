import { describe, expect, it, vi } from 'vitest'
// Aliased, deliberately: the last block pins the server's error codes to the web's copy.
import { GOOGLE_ERROR_CODES } from '@constants/auth'
// Types only, erased at runtime. The type checker still walks into `oauth-state.ts`, which
// writes `req.oauthFlow` — a field the server declares on Express's `Request` in a file the
// root tsconfig never includes.
import type {} from '../../../server/src/types/express'

// `google-oauth.ts` imports `config.js`, which loads the API's env file at import time,
// and `oauth-state.js`, which imports config too. Neither is under test here, so both are
// replaced outright — the factories mean the real modules are never evaluated.
vi.mock('../../../server/src/config', () => ({
  config: { google: { clientId: '', clientSecret: '', redirectUri: '' } },
  isGoogleOAuthConfigured: () => false,
}))
vi.mock('../../../server/src/lib/oauth-state', () => ({ oauthStateStore: {} }))

const { fullNameOf, GOOGLE_ERROR, readGoogleProfile } = await import('../../../server/src/lib/google-oauth')

type NameProfile = Parameters<typeof fullNameOf>[0]
type GoogleProfile = Parameters<typeof readGoogleProfile>[0]

const EMAIL = 'anna.petrosyan@example.com'

/**
 * The name a Google sign-up starts with. The completion form shows it for correction, but
 * whatever it says is what most people keep — so the order a person writes their own name
 * in has to win over Google's given/family split.
 */
describe('fullNameOf', () => {
  it("prefers Google's display name, in the order the person wrote it", () => {
    const profile: NameProfile = {
      displayName: 'Petrosyan Anna',
      name: { givenName: 'Anna', familyName: 'Petrosyan' },
    }
    expect(fullNameOf(profile, EMAIL)).toBe('Petrosyan Anna')
  })

  it('collapses the whitespace in a display name', () => {
    expect(fullNameOf({ displayName: '  Anna \t Maria   Petrosyan ' }, EMAIL)).toBe('Anna Maria Petrosyan')
  })

  it('joins the given and family names when there is no display name', () => {
    const profile: NameProfile = { displayName: '   ', name: { givenName: ' Anna ', familyName: ' Petrosyan ' } }
    expect(fullNameOf(profile, EMAIL)).toBe('Anna Petrosyan')
  })

  it('uses whichever half Google sent when it sent only one', () => {
    expect(fullNameOf({ displayName: '', name: { givenName: 'Anna', familyName: '' } }, EMAIL)).toBe('Anna')
    expect(fullNameOf({ displayName: '', name: { givenName: '', familyName: 'Petrosyan' } }, EMAIL)).toBe('Petrosyan')
  })

  // A name is mandatory on both profile tables, so the fallback is something the person
  // recognises rather than a placeholder like "New Provider".
  it("falls back to the email's local part", () => {
    expect(fullNameOf({ displayName: '' }, EMAIL)).toBe('anna.petrosyan')
  })

  it('names the account Bookie only when even the local part is empty', () => {
    expect(fullNameOf({ displayName: '' }, '@example.com')).toBe('Bookie')
  })
})

describe('readGoogleProfile', () => {
  const profile = (overrides: Partial<GoogleProfile> = {}): GoogleProfile =>
    ({
      id: 'google-sub-1',
      displayName: 'Anna Petrosyan',
      name: { givenName: 'Anna', familyName: 'Petrosyan' },
      emails: [{ value: 'Anna.Petrosyan@Example.com', verified: true }],
      photos: [],
      _json: {},
      ...overrides,
    }) as unknown as GoogleProfile

  it('carries one fullName and a lowercased email', () => {
    expect(readGoogleProfile(profile())).toEqual({
      googleId: 'google-sub-1',
      email: 'anna.petrosyan@example.com',
      fullName: 'Anna Petrosyan',
      avatarUrl: undefined,
    })
  })

  // The gate: an unverified address must never be linked to, or claim, an account.
  it('rejects an address Google has not verified', () => {
    const unverified = profile({ emails: [{ value: EMAIL, verified: false }] as GoogleProfile['emails'] })
    expect(readGoogleProfile(unverified)).toBeNull()
  })
})

// The callback redirects with `?error=<code>`; a code the web does not list renders as an
// unknown failure instead of its own sentence.
describe('GOOGLE_ERROR', () => {
  it('matches the codes the web app knows how to word', () => {
    expect(Object.values(GOOGLE_ERROR).sort()).toEqual([...GOOGLE_ERROR_CODES].sort())
  })
})
