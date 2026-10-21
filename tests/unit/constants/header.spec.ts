import english from '@messages/en.json'
import { describe, expect, it } from 'vitest'
import {
  DIRECTORIES_PRESENT,
  getHeaderConfig,
  HEADER_ACCOUNT_ROUTES,
  HEADER_ROUTES,
  withAccountRoutes,
  withoutEmptyDirectories,
} from '@constants/header'
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
  it('adds Bookings and Favorites once signed in, and keeps Pricing last', () => {
    expect(withAccountRoutes(HEADER_ROUTES, true)).toEqual([
      ROUTE_KEYS.providers,
      ROUTE_KEYS.categories,
      ROUTE_KEYS.organizations,
      ROUTE_KEYS.bookings,
      ROUTE_KEYS.favorites,
      ROUTE_KEYS.pricing,
    ])
  })

  // Both pages are guarded, so a guest would only be detoured through sign-in.
  it('offers a guest neither', () => {
    expect(withAccountRoutes(HEADER_ROUTES, false)).toEqual(HEADER_ROUTES)
  })
})

describe('withoutEmptyDirectories', () => {
  it('keeps every directory link when each table has a row', () => {
    expect(withoutEmptyDirectories(HEADER_ROUTES, DIRECTORIES_PRESENT)).toEqual(HEADER_ROUTES)
  })

  it('drops a directory whose table is empty and still leaves Pricing last once signed in', () => {
    const routes = withAccountRoutes(
      withoutEmptyDirectories(HEADER_ROUTES, { providers: true, categories: false, organizations: false }),
      true
    )

    expect(routes).toEqual([
      ROUTE_KEYS.providers,
      ROUTE_KEYS.bookings,
      ROUTE_KEYS.favorites,
      ROUTE_KEYS.pricing,
    ])
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
