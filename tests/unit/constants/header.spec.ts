import english from '@messages/en.json'
import { describe, expect, it } from 'vitest'
import { getHeaderConfig, HEADER_ACCOUNT_ROUTES, HEADER_ROUTES, withAccountRoutes } from '@constants/header'
import { ROUTE_KEYS } from '@constants/routes'

describe('getHeaderConfig', () => {
  it('keeps marketplace nav on the providers route, including a public provider page', () => {
    expect(getHeaderConfig(ROUTE_KEYS.providers).navRoutes).toEqual(HEADER_ROUTES)
  })

  it('keeps marketplace nav on the provider workspace', () => {
    expect(getHeaderConfig(ROUTE_KEYS.providerProfile).navRoutes).toEqual(HEADER_ROUTES)
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
