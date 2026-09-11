import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'
import { BRAND, NEUTRAL } from '@styles/tokens'
import manifest from '../../../src/app/manifest'

const webManifest = manifest()

describe('web app manifest', () => {
  it('is installable: standalone display, a 512 icon, a start_url that is a document', () => {
    expect(webManifest.display).toBe('standalone')
    expect(webManifest.start_url).toBe(localePath(DEFAULT_LOCALE, ROUTES.home))
    expect(webManifest.start_url).not.toBe('/')
    expect(webManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icon', sizes: '512x512', purpose: 'any' }),
        expect.objectContaining({ src: '/icon-maskable', sizes: '512x512', purpose: 'maskable' }),
      ])
    )
  })

  it('keeps a stable identity separate from start_url', () => {
    expect(webManifest.id).toBe('/')
  })

  it('does not lock orientation — a desktop or tablet install must rotate', () => {
    expect(webManifest.orientation).toBeUndefined()
  })

  it('paints chrome from the same tokens as the rest of the app', () => {
    expect(webManifest.theme_color).toBe(BRAND[900])
    expect(webManifest.background_color).toBe(NEUTRAL[0])
  })

  it('pins shortcuts to the default locale, same reason as start_url', () => {
    const urls = webManifest.shortcuts?.map((shortcut) => shortcut.url) ?? []

    expect(urls).toContain(localePath(DEFAULT_LOCALE, ROUTES.providers))
    expect(urls).toContain(localePath(DEFAULT_LOCALE, ROUTES.signIn))
  })
})
