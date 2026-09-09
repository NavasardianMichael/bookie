import { GET } from '@app/[lang]/p/[slug]/route'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

/**
 * The vanity link's contract, pinned because the way it can break is invisible.
 *
 * This was first written as a `page.tsx` calling `redirect()`. The root layout streams
 * before a page body runs, so Next could not send a header any more and silently
 * downgraded to a client-side navigation: HTTP 200, an empty shell, **no `Location`**.
 * Every other gate passed — it typechecked, it linted, it built, and it worked in a
 * browser. Only a crawler, which is the audience a shareable link exists for, could tell.
 *
 * So these assert the two things a page could not give: a real redirect status and a real
 * `Location`.
 */

const call = (lang: string, slug: string) =>
  GET(new NextRequest(`https://bookie.test/${lang}/p/${slug}`), {
    params: Promise.resolve({ lang, slug }),
  })

describe('GET /[lang]/p/[slug]', () => {
  it('answers with a real redirect, not a rendered document', async () => {
    const response = await call('en', 'acme-hair')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://bookie.test/en/providers/acme-hair')
  })

  it('stays 307, never 308', async () => {
    // A permanent redirect is cached by the browser itself, so it would outlive a slug
    // change and keep sending returning visitors to a link the provider has renamed.
    const response = await call('en', 'acme-hair')
    expect(response.status).not.toBe(308)
    expect(response.status).not.toBe(301)
  })

  it('keeps the visitor in the locale they arrived in', async () => {
    const response = await call('hy', 'acme-hair')
    expect(response.headers.get('location')).toBe('https://bookie.test/hy/providers/acme-hair')
  })

  it('falls back to the default locale for a segment that is not one of ours', async () => {
    // The segment is whatever is in the URL; nothing at the type level makes it a Locale.
    const response = await call('klingon', 'acme-hair')
    expect(response.headers.get('location')).toBe('https://bookie.test/en/providers/acme-hair')
  })

  it('encodes the slug rather than letting it alter the path', async () => {
    const response = await call('en', 'a/../../admin')
    expect(response.headers.get('location')).toBe('https://bookie.test/en/providers/a%2F..%2F..%2Fadmin')
  })

  it('redirects an unknown slug too, so the detail page answers the 404', async () => {
    // No API call here on purpose: `GET /providers/:idOrSlug` already resolves either
    // form, and letting the detail page decide keeps "does this slug exist" in one place
    // — with the app's real not-found UI rather than a bare handler response.
    const response = await call('en', 'definitely-not-a-provider')
    expect(response.status).toBe(307)
  })
})
