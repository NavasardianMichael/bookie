import { describe, expect, it } from 'vitest'
// Relative, not aliased: `server/` is a separate package. This module imports nothing, which
// is the stated reason the rule was lifted out of `config.ts` — see `tests/CLAUDE.md`.
import { deriveCookieDomain } from '../../../server/src/lib/cookie-domain'

/**
 * The reach of the session cookie.
 *
 * Worth its own spec because the failure is silent and points away from itself: with no
 * `Domain`, the cookie the API mints is host-only on `api.<host>`, the browser keeps sending
 * it to the API, every request the API sees is authenticated — and the *web* host, where
 * `src/proxy.ts` gates the signed-in routes, sees nothing and bounces the user to sign-in.
 * Local dev cannot reproduce it, because there both halves are `localhost` and a host-only
 * cookie already spans them.
 */
describe('deriveCookieDomain', () => {
  const WEB = 'https://bookie.mnavasardian.com'

  it('is the web hostname in production, so the api. subdomain is covered', () => {
    expect(deriveCookieDomain('production', WEB)).toBe('bookie.mnavasardian.com')
  })

  // The whole point: `bookie.<domain>` matches itself and its subdomains, and
  // `api.bookie.<domain>` is one. The registrable domain would match far more.
  it('does not widen to the registrable domain', () => {
    expect(deriveCookieDomain('production', WEB)).not.toBe('mnavasardian.com')
    expect(deriveCookieDomain('production', WEB)).not.toMatch(/^\./)
  })

  it('drops the port and scheme, which a Domain may not carry', () => {
    expect(deriveCookieDomain('production', 'https://bookie.example.com:8443')).toBe('bookie.example.com')
  })

  // Dev is single-host (`localhost:7004` and `localhost:9004` differ only by a port, and
  // cookies ignore ports), so a host-only cookie already reaches both halves.
  it.each([['development'], ['test'], ['']])('stays host-only outside production (%s)', (env) => {
    expect(deriveCookieDomain(env, WEB)).toBe('')
  })

  // `Domain=localhost` is rejected by browsers outright, which would be worse than omitting
  // the attribute — the cookie would not be set at all.
  it.each([
    ['a dotless hostname', 'http://localhost:7004'],
    ['a dotless custom host', 'https://bookie-internal'],
  ])('stays host-only for %s', (_label, origin) => {
    expect(deriveCookieDomain('production', origin)).toBe('')
  })

  // A bad CORS_ORIGIN should fail at requireSameOrigin, where the error names the real
  // problem — not at process boot with a URL stack trace.
  it.each([
    ['an empty origin', ''],
    ['a bare hostname with no scheme', 'bookie.example.com'],
    ['nonsense', 'not a url'],
  ])('returns empty rather than throwing on %s', (_label, origin) => {
    expect(() => deriveCookieDomain('production', origin)).not.toThrow()
    expect(deriveCookieDomain('production', origin)).toBe('')
  })
})
