import { describe, expect, it } from 'vitest'
import { buildOfflineDocument, buildServiceWorkerScript, PWA_CACHE_NAME } from '@helpers/pwa'
import { BRAND, NEUTRAL } from '@styles/tokens'

const colors = {
  background: NEUTRAL[0],
  text: BRAND[900],
  muted: NEUTRAL[600],
  brand: BRAND[900],
  onBrand: NEUTRAL[0],
}

describe('buildOfflineDocument', () => {
  const html = buildOfflineDocument(colors)

  it('is a standalone HTML document painted from tokens', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain(`background: ${NEUTRAL[0]}`)
    expect(html).toContain(`color: ${BRAND[900]}`)
    expect(html).toContain(NEUTRAL[600])
  })

  it('retries the failed URL without inline script', () => {
    expect(html).toContain('<a href="">Try again</a>')
    expect(html).not.toContain('<script')
  })
})

describe('buildServiceWorkerScript', () => {
  const script = buildServiceWorkerScript({
    cacheName: PWA_CACHE_NAME,
    offlineDocument: buildOfflineDocument(colors),
  })

  it('takes over immediately and drops outdated caches', () => {
    expect(script).toContain('self.skipWaiting()')
    expect(script).toContain('self.clients.claim()')
    expect(script).toContain(`const CACHE = ${JSON.stringify(PWA_CACHE_NAME)}`)
  })

  it('intercepts only GET navigations, so HTML and API are never cached', () => {
    expect(script).toContain("if (request.method !== 'GET') return;")
    expect(script).toContain("if (request.mode !== 'navigate') return;")
    expect(script).toContain('return await fetch(request);')
    expect(script).not.toContain('caches.match(request)')
  })

  it('embeds the offline document as a JSON string, not a raw template', () => {
    expect(script).toContain(`const OFFLINE_HTML = ${JSON.stringify(buildOfflineDocument(colors))}`)
  })
})
