import { describe, expect, it } from 'vitest'
import { generateEntityUrl } from '@helpers/entities'
import { absoluteUrl, getSiteUrl, toWebsiteUrl } from '@helpers/url'

// `getSiteUrl` re-reads process.env on every call, so these assert relative to it
// rather than hardcoding the fallback origin.
describe('getSiteUrl', () => {
  it('never ends in a slash', () => {
    expect(getSiteUrl()).not.toMatch(/\/$/)
  })

  it('is an absolute origin', () => {
    expect(getSiteUrl()).toMatch(/^https?:\/\//)
  })
})

describe('absoluteUrl', () => {
  it('joins a root-relative path', () => {
    expect(absoluteUrl('/providers')).toBe(`${getSiteUrl()}/providers`)
  })

  it('adds the missing leading slash', () => {
    expect(absoluteUrl('providers')).toBe(`${getSiteUrl()}/providers`)
  })

  it('never produces a doubled separator', () => {
    expect(absoluteUrl('/providers')).not.toMatch(/[^:]\/\//)
  })

  it('maps an empty path to the site root', () => {
    expect(absoluteUrl('')).toBe(`${getSiteUrl()}/`)
  })
})

describe('generateEntityUrl', () => {
  it('builds a canonical entity page URL on the site origin, not the API origin', () => {
    expect(generateEntityUrl('providers', 'abc')).toBe(`${getSiteUrl()}/providers/abc`)
  })

  // `ROUTES.home` is '/', so the template used to produce '//<id>' — and a leading `//`
  // reads as a protocol-relative URL rather than a path.
  it('does not double the slash for the home route', () => {
    expect(generateEntityUrl('home', 'abc')).toBe(`${getSiteUrl()}/abc`)
  })
})

describe('toWebsiteUrl', () => {
  it('gives a bare domain https://, since nobody types the scheme', () => {
    expect(toWebsiteUrl('acme.am')).toBe('https://acme.am')
    expect(toWebsiteUrl('  www.acme.am/booking ')).toBe('https://www.acme.am/booking')
  })

  it('keeps an explicit http(s) scheme, without the slash URL adds to a bare origin', () => {
    expect(toWebsiteUrl('http://acme.am/')).toBe('http://acme.am')
    expect(toWebsiteUrl('https://acme.am/?ref=bookie')).toBe('https://acme.am/?ref=bookie')
  })

  it('refuses any other scheme — the value becomes a link on a public page', () => {
    expect(toWebsiteUrl('javascript:alert(1)')).toBeUndefined()
    expect(toWebsiteUrl('ftp://acme.am')).toBeUndefined()
    expect(toWebsiteUrl('mailto:info@acme.am')).toBeUndefined()
  })

  it('refuses text that is not an address at all', () => {
    expect(toWebsiteUrl('acme')).toBeUndefined()
    expect(toWebsiteUrl('acme .am')).toBeUndefined()
    expect(toWebsiteUrl('   ')).toBeUndefined()
    expect(toWebsiteUrl(undefined)).toBeUndefined()
  })
})
