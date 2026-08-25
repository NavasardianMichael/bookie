import { describe, expect, it } from 'vitest'
import { isRouteActive, matchRouteName } from '@helpers/routes'

describe('matchRouteName', () => {
  it('resolves a dynamic detail path to its parent route', () => {
    expect(matchRouteName('/providers/abc')).toBe('providers')
  })

  // Longest-first ordering is load-bearing: /providers/profile-services,
  // /providers/profile-creation and /providers/profile all share a prefix with
  // /providers, and a shortest-first scan would collapse them all to `providers`.
  it('prefers the longest matching route', () => {
    expect(matchRouteName('/providers/profile')).toBe('providerProfile')
    expect(matchRouteName('/providers/profile-services')).toBe('providerServices')
    expect(matchRouteName('/providers/profile-creation')).toBe('providerProfileCreation')
  })

  it('ignores a trailing slash', () => {
    expect(matchRouteName('/providers/')).toBe('providers')
    expect(matchRouteName('/providers///')).toBe('providers')
  })

  it('matches home only exactly', () => {
    expect(matchRouteName('/')).toBe('home')
    expect(matchRouteName('')).toBe('home')
  })

  it('does not match a route that is merely a string prefix', () => {
    expect(matchRouteName('/providersXYZ')).toBeUndefined()
  })

  it('returns undefined for an unknown path rather than falling back to home', () => {
    expect(matchRouteName('/nope')).toBeUndefined()
  })
})

describe('isRouteActive', () => {
  it('is true for the route itself and its children', () => {
    expect(isRouteActive('/providers', '/providers')).toBe(true)
    expect(isRouteActive('/providers/abc', '/providers')).toBe(true)
  })

  it('is false for a sibling that shares a prefix', () => {
    expect(isRouteActive('/providersXYZ', '/providers')).toBe(false)
  })

  it('treats home as exact', () => {
    expect(isRouteActive('/', '/')).toBe(true)
    expect(isRouteActive('/providers', '/')).toBe(false)
  })
})
