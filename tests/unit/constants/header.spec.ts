import english from '@messages/en.json'
import { describe, expect, it } from 'vitest'
import { getHeaderConfig, HEADER_ACCOUNT_ROUTES, HEADER_ROUTES, withAccountRoutes } from '@constants/header'
import { ROUTE_KEYS } from '@constants/routes'

describe('getHeaderConfig', () => {
  it('keeps marketplace nav on Explore', () => {
    expect(getHeaderConfig(ROUTE_KEYS.providers, '/providers').navRoutes).toEqual(HEADER_ROUTES)
  })

  it('drops Explore, Categories and Organizations on a public provider page', () => {
    expect(getHeaderConfig(ROUTE_KEYS.providers, '/providers/abc').navRoutes).toEqual([ROUTE_KEYS.home])
  })

  it('keeps marketplace nav on the provider workspace', () => {
    expect(getHeaderConfig(ROUTE_KEYS.providerProfile, '/providers/profile').navRoutes).toEqual(
      HEADER_ROUTES
    )
  })
})

describe('withAccountRoutes', () => {
  it('adds Bookings and Favorites after the route’s own destinations once signed in', () => {
    expect(withAccountRoutes(HEADER_ROUTES, true)).toEqual([
      ...HEADER_ROUTES,
      ROUTE_KEYS.bookings,
      ROUTE_KEYS.favorites,
    ])
  })

  // Both pages are guarded, so a guest would only be detoured through sign-in.
  it('offers a guest neither', () => {
    expect(withAccountRoutes(HEADER_ROUTES, false)).toEqual(HEADER_ROUTES)
  })

  /**
   * They follow the session, not the route: the public provider page drops the marketplace
   * destinations but keeps the avatar, and these sit with the avatar.
   */
  it('keeps them on the public provider page, where the marketplace nav is dropped', () => {
    const { navRoutes } = getHeaderConfig(ROUTE_KEYS.providers, '/providers/abc')
    expect(withAccountRoutes(navRoutes, true)).toEqual([ROUTE_KEYS.home, ...HEADER_ACCOUNT_ROUTES])
  })
})

/**
 * The label is looked up by route name in `Nav` at render time, so a destination without
 * a key renders its raw name. `catalogues.spec.ts` holds every locale to English's keys;
 * this holds English to the header.
 */
describe('header labels', () => {
  it('has a Nav message for every destination the header can render', () => {
    for (const name of [...HEADER_ROUTES, ...HEADER_ACCOUNT_ROUTES]) {
      expect(english.Nav, name).toHaveProperty(name)
    }
  })
})
