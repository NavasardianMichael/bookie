import { GET } from '@app/[lang]/providers/[providerId]/route'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

/**
 * The provider page's old address, `/<lang>/providers/<id|slug>`, now that the page is
 * `/p/<key>` (`docs/routes/provider-page.md`).
 *
 * A Route Handler rather than a page calling `redirect()`, for the reason the old vanity
 * handler was: a page streams first, so its redirect downgrades to a client-side navigation
 * — HTTP 200, no `Location` — which only a crawler notices, and a crawler is who this is for.
 * So these pin a real status and a real `Location`.
 */
const call = (lang: string, providerId: string, query = '') =>
  GET(new NextRequest(`https://bookie.test/${lang}/providers/${providerId}${query}`), {
    params: Promise.resolve({ lang, providerId }),
  })

describe('GET /[lang]/providers/[providerId]', () => {
  it('moves the page permanently to /p/<key>, keeping the language as ?lang=', async () => {
    const response = await call('hy', 'acme-hair')
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://bookie.test/p/acme-hair?lang=hy')
  })

  // A 308, not a 307: the move is permanent, and a permanent redirect is what carries an
  // indexed URL's standing over to the new one.
  it('is permanent', async () => {
    const response = await call('en', '6f1c2f3e-8d4b-4a8e-9b0c-1d2e3f4a5b6c')
    expect(response.status).toBe(308)
  })

  it('keeps the rest of the query — a linked service or reviews page', async () => {
    const response = await call('en', 'acme-hair', '?service=s-1&reviews=2')
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/p/acme-hair')
    expect(location.searchParams.get('service')).toBe('s-1')
    expect(location.searchParams.get('reviews')).toBe('2')
    expect(location.searchParams.get('lang')).toBe('en')
  })

  it('falls back to the default locale for a segment that is not one of ours', async () => {
    const response = await call('klingon', 'acme-hair')
    expect(response.headers.get('location')).toBe('https://bookie.test/p/acme-hair?lang=en')
  })

  it('encodes the key rather than letting it alter the path', async () => {
    const response = await call('en', 'a/../../admin')
    expect(new URL(response.headers.get('location')!).pathname).toBe('/p/a%2F..%2F..%2Fadmin')
  })
})
