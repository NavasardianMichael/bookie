import { NextRequest, NextResponse } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * next-intl's middleware bare-imports `next/server`, which Vite cannot resolve from
 * inside its own pnpm directory. Stubbing it is not a workaround for that alone: the
 * subject here is *our* logic — negotiation, the auth guard, and the cache headers on
 * a personalized redirect. Whether next-intl then validates an already-prefixed path
 * is its own concern, and this stub is exactly its pass-through behaviour.
 */
vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}))

const { proxy } = await import('../../../src/proxy')

const SITE = 'https://bookie.test'

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, SITE), { headers: new Headers(headers) })

describe('proxy — locale routing', () => {
  it('sends an unprefixed path to the Accept-Language match', () => {
    const response = proxy(request('/providers', { 'accept-language': 'es-ES,es;q=0.9' }))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${SITE}/es/providers`)
  })

  it('collapses the bare root to /<locale>, not /<locale>/', () => {
    const response = proxy(request('/', { 'accept-language': 'de' }))

    expect(response.headers.get('location')).toBe(`${SITE}/de`)
  })

  it('lets an explicit cookie choice outrank the browser header', () => {
    const response = proxy(request('/providers', { 'accept-language': 'de', cookie: 'NEXT_LOCALE=ja' }))

    expect(response.headers.get('location')).toBe(`${SITE}/ja/providers`)
  })

  // The three headers next-intl's own negotiation resolves to English. A secondary
  // English preference is near-universal, so these are not edge cases.
  it.each([
    ['pt-PT,en;q=0.9', 'pt-BR'],
    ['zh-TW,en;q=0.9', 'zh-CN'],
    ['es-419,en;q=0.9', 'es'],
  ])('routes %s to /%s rather than English', (header, expected) => {
    const response = proxy(request('/providers', { 'accept-language': header }))

    expect(response.headers.get('location')).toBe(`${SITE}/${expected}/providers`)
  })

  it('leaves an already-prefixed path alone', () => {
    const response = proxy(request('/es/providers', { 'accept-language': 'ja' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})

describe('proxy — cache safety', () => {
  /**
   * A negotiated redirect is personalized. Without these a shared cache may store
   * one visitor's target under the bare URL and replay it for everyone — the bug
   * never shows up locally, because `next dev` has no CDN in front of it.
   */
  it.each([
    ['locale negotiation', '/providers', { 'accept-language': 'es' }],
    ['auth guard', '/en/providers/profile', {}],
  ])('marks the %s redirect uncacheable and Vary-ing', (_label, path, headers) => {
    const response = proxy(request(path, headers))

    expect(response.status).toBe(307)
    expect(response.headers.get('cache-control')).toBe('no-store')

    const vary = response.headers.get('vary') ?? ''
    expect(vary).toContain('Accept-Language')
    expect(vary).toContain('Cookie')
  })

  // 308 would be cached by the browser itself, pinning a visitor to the first
  // language they ever negotiated and outliving the language switcher.
  it('never redirects permanently', () => {
    expect(proxy(request('/providers', { 'accept-language': 'fr' })).status).not.toBe(308)
  })

  it('sends a signed-in visitor past the auth guard', () => {
    const response = proxy(request('/en/providers/profile', { cookie: 'bookie_session=token' }))

    expect(response.status).toBe(200)
  })
})
