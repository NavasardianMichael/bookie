import { describe, expect, it } from 'vitest'
import { getInitials, isUploadedAsset, resolveAbsoluteAssetUrl, resolveAssetUrl } from '@helpers/images'
import { absoluteUrl } from '@helpers/url'

/**
 * `images.ts` captures `API_ORIGIN` at module top level, so it cannot be changed after
 * import. With no `NEXT_PUBLIC_API_URL` set in the test env it is the documented default.
 * To test a different origin, set the env var and `vi.resetModules()` before importing.
 */
const API_ORIGIN = 'http://localhost:4142'

describe('resolveAssetUrl', () => {
  it('prefixes a root-relative upload with the API origin', () => {
    expect(resolveAssetUrl('/uploads/avatar.png')).toBe(`${API_ORIGIN}/uploads/avatar.png`)
  })

  it.each(['https://cdn.example.com/a.png', 'http://x.test/a.png', 'data:image/png;base64,AAA', 'blob:x'])(
    'leaves %s untouched',
    (src) => {
      expect(resolveAssetUrl(src)).toBe(src)
    }
  )

  it('leaves a non-upload site asset root-relative', () => {
    expect(resolveAssetUrl('/logo.svg')).toBe('/logo.svg')
  })

  it.each([undefined, ''])('returns undefined for %o', (src) => {
    expect(resolveAssetUrl(src)).toBeUndefined()
  })

  it('is case sensitive on the uploads prefix', () => {
    expect(resolveAssetUrl('/Uploads/a.png')).toBe('/Uploads/a.png')
  })
})

describe('resolveAbsoluteAssetUrl', () => {
  it('makes a site asset absolute against the site origin', () => {
    expect(resolveAbsoluteAssetUrl('/logo.svg')).toBe(absoluteUrl('/logo.svg'))
  })

  it('keeps an API-origin upload as-is', () => {
    expect(resolveAbsoluteAssetUrl('/uploads/a.png')).toBe(`${API_ORIGIN}/uploads/a.png`)
  })

  it('returns undefined for no source', () => {
    expect(resolveAbsoluteAssetUrl(undefined)).toBeUndefined()
  })

  // JSON-LD `image` is read away from the page that served it, so a root-relative
  // value would resolve against the wrong origin or none at all.
  it('never returns a root-relative URL', () => {
    for (const src of ['/logo.svg', '/uploads/a.png', 'https://cdn.test/a.png']) {
      expect(resolveAbsoluteAssetUrl(src)).toMatch(/^(https?:|data:)/)
    }
  })
})

describe('isUploadedAsset', () => {
  it.each([
    ['/uploads/a.png', true],
    ['https://cdn.test/a.png', true],
    ['/logo.svg', false],
    ['', false],
    [undefined, false],
  ])('%o -> %s', (src, expected) => {
    expect(isUploadedAsset(src)).toBe(expected)
  })
})

describe('getInitials', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['ada lovelace', 'AL'],
    ['Ada', 'A'],
    ['Ada Byron King Lovelace', 'AB'],
    ['  Ada   Lovelace  ', 'AL'],
    ['', ''],
    ['   ', ''],
  ])('renders %o as %o', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
  })
})
