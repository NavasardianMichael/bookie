import { describe, expect, it } from 'vitest'
import { isLocaleFreePath, localePath, PROVIDER_PAGE_PREFIX } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'

/**
 * `/p/<key>` is the one page route without a locale segment (`docs/routes/provider-page.md`).
 * `localePath` — under `AppLink`, absolute URLs and the sitemap — must leave it alone, or
 * every link to a provider would cost a 308 back to the bare URL.
 */
describe('localePath', () => {
  it('prefixes every other route', () => {
    expect(localePath('hy', ROUTES.providers)).toBe('/hy/providers')
    expect(localePath('en', ROUTES.home)).toBe('/en')
  })

  it('leaves the provider page unprefixed', () => {
    expect(localePath('hy', '/p/acme-hair')).toBe('/p/acme-hair')
  })
})

describe('isLocaleFreePath', () => {
  it('is spelled the same as the route it describes', () => {
    expect(PROVIDER_PAGE_PREFIX).toBe(ROUTES.providerPage)
  })

  it('matches the page and nothing that only starts with the same letter', () => {
    expect(isLocaleFreePath('/p/acme-hair')).toBe(true)
    expect(isLocaleFreePath('/p')).toBe(true)
    expect(isLocaleFreePath(ROUTES.pricing)).toBe(false)
    expect(isLocaleFreePath(ROUTES.providers)).toBe(false)
  })
})
