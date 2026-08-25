import { describe, expect, it } from 'vitest'
import { generateEntityUrl } from '@helpers/entities'
import { absoluteUrl, getSiteUrl } from '@helpers/url'

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

  // ROUTES.home is '/', so the template produces '//<id>'. Every other route is fine.
  // See docs/BACKLOG.md.
  it('KNOWN BUG: doubles the slash for the home route', () => {
    expect(generateEntityUrl('home', 'abc')).toBe(`${getSiteUrl()}//abc`)
  })
})
