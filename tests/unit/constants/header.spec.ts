import { describe, expect, it } from 'vitest'
import { getHeaderConfig, HEADER_ROUTES } from '@constants/header'
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
