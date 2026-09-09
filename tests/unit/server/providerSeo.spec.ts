import { describe, expect, it } from 'vitest'
import { LOCALES } from '@i18n/config'
import {
  looksLikeProviderId,
  MAX_SEO_DESCRIPTION,
  MAX_SEO_TITLE,
  parseProviderSeoBody,
  RESERVED_SLUGS,
} from '../../../server/src/services/providerSeo'

/**
 * The SEO tab writes four columns straight into public `<meta>` tags and a URL segment,
 * so this file is the security boundary rather than a formatting nicety. The route is a
 * five-line delegate; every rule that matters lives in the service under test.
 */

const throws = (body: unknown): (() => unknown) => () => parseProviderSeoBody(body)

describe('parseProviderSeoBody — three states per field', () => {
  it('omits a key that was not sent, so a partial edit cannot clear a field', () => {
    expect(parseProviderSeoBody({ slug: 'acme-hair' })).toEqual({ slug: 'acme-hair' })
  })

  it('reads an empty string as "clear the override", not as an empty tag', () => {
    // null is what Prisma needs to null the column; the public page then falls back to
    // its composed title rather than rendering nothing.
    expect(parseProviderSeoBody({ seoTitle: '' })).toEqual({ seoTitle: null })
    expect(parseProviderSeoBody({ seoTitle: '   ' })).toEqual({ seoTitle: null })
  })

  it('passes an explicit null through as a clear', () => {
    expect(parseProviderSeoBody({ seoDescription: null })).toEqual({ seoDescription: null })
  })

  it('returns nothing at all for an empty body, so the route can answer 400', () => {
    expect(parseProviderSeoBody({})).toEqual({})
    expect(parseProviderSeoBody(null)).toEqual({})
  })
})

describe('parseProviderSeoBody — text sanitising', () => {
  it('strips control characters rather than escaping them', () => {
    // A newline inside a meta content attribute is the injection shape; the collapse to
    // a single space is what keeps the title one line.
    const result = parseProviderSeoBody({ seoTitle: 'Acme\nHair\tStudio' })
    expect(result.seoTitle).toBe('Acme Hair Studio')
  })

  it('strips zero-width and bidi characters, which spoof a search result', () => {
    // Built from code points rather than written literally: a real RLO in this file
    // is a trojan-source character in the repo, and `security/detect-bidi-characters`
    // is right to flag one even in the test that proves we strip it.
    const RLO = String.fromCodePoint(0x202e)
    const POP = String.fromCodePoint(0x202c)
    const ZWSP = String.fromCodePoint(0x200b)

    expect(parseProviderSeoBody({ seoTitle: `Acme${RLO}riaH${POP} Studio` }).seoTitle).toBe('AcmeriaH Studio')
    expect(parseProviderSeoBody({ seoTitle: `Ac${ZWSP}me` }).seoTitle).toBe('Acme')
  })

  it('normalises to NFC so two spellings of one string count the same', () => {
    // "é" as e + combining acute is two code points before normalisation, one after.
    expect(parseProviderSeoBody({ seoTitle: 'Café' }).seoTitle).toBe('Café')
  })

  it('rejects angle brackets even though Next escapes metadata', () => {
    expect(throws({ seoTitle: '<script>alert(1)</script>' })).toThrow(/< or >/)
    expect(throws({ seoDescription: 'a > b' })).toThrow(/< or >/)
  })

  it('rejects an over-length field rather than truncating it', () => {
    // Deviates from `asBoundedString`'s cap-do-not-reject rule on purpose: the field is
    // counted live in the browser, so an over-length body is a non-browser caller, and a
    // half-title reaches Google mid-word.
    expect(throws({ seoTitle: 'a'.repeat(MAX_SEO_TITLE + 1) })).toThrow(/60 characters or fewer/)
    expect(throws({ seoDescription: 'a'.repeat(MAX_SEO_DESCRIPTION + 1) })).toThrow(/160 characters or fewer/)
  })

  it('counts code points, not UTF-16 units, so an emoji is one character', () => {
    // 60 astral characters is 120 UTF-16 units — a `.length` cap would reject this.
    expect(parseProviderSeoBody({ seoTitle: '😀'.repeat(MAX_SEO_TITLE) }).seoTitle).toHaveLength(
      MAX_SEO_TITLE * 2
    )
    expect(throws({ seoTitle: '😀'.repeat(MAX_SEO_TITLE + 1) })).toThrow(/characters or fewer/)
  })
})

describe('parseProviderSeoBody — keywords', () => {
  it('joins an array into the comma-separated shape the meta tag wants', () => {
    expect(parseProviderSeoBody({ seoKeywords: ['hair', 'salon'] }).seoKeywords).toBe('hair, salon')
  })

  it('replaces a comma inside one keyword, since a comma is the separator', () => {
    expect(parseProviderSeoBody({ seoKeywords: ['hair, beauty'] }).seoKeywords).toBe('hair beauty')
  })

  it('dedupes case-insensitively rather than spending the cap twice', () => {
    expect(parseProviderSeoBody({ seoKeywords: ['Hair', 'hair', 'HAIR'] }).seoKeywords).toBe('Hair')
  })

  it('drops blanks and clears when nothing survives', () => {
    expect(parseProviderSeoBody({ seoKeywords: ['', '  '] }).seoKeywords).toBeNull()
  })

  it('caps the list and each entry', () => {
    expect(throws({ seoKeywords: Array.from({ length: 11 }, (_, i) => `k${i}`) })).toThrow(/At most 10/)
    expect(throws({ seoKeywords: ['a'.repeat(41)] })).toThrow(/40 characters or fewer/)
  })

  it('refuses a non-string entry', () => {
    expect(throws({ seoKeywords: [1] })).toThrow(/array of strings/)
  })
})

describe('parseProviderSeoBody — the slug is an address', () => {
  it('lowercases and accepts a well-formed slug', () => {
    expect(parseProviderSeoBody({ slug: 'Acme-Hair-2' }).slug).toBe('acme-hair-2')
  })

  it('refuses a leading, trailing or doubled hyphen', () => {
    for (const bad of ['-acme', 'acme-', 'ac--me']) {
      expect(throws({ slug: bad }), bad).toThrow(/lowercase letters, numbers and single hyphens/)
    }
  })

  it('refuses non-ASCII, because a homograph impersonates another provider', () => {
    // Cyrillic а (U+0430) renders identically to Latin a in most fonts.
    expect(throws({ slug: 'аcme-hair' })).toThrow(/lowercase letters, numbers and single hyphens/)
  })

  it('refuses a slug shaped like a provider id', () => {
    // A UUID is hex in hyphen-separated groups, so it passes the character rules —
    // without this check a provider could take another provider's canonical address.
    expect(throws({ slug: '550e8400-e29b-41d4-a716-446655440000' })).toThrow(/cannot look like a profile id/)
  })

  it('refuses a slug that is too short or too long', () => {
    expect(throws({ slug: 'ab' })).toThrow(/between 3 and 40/)
    expect(throws({ slug: 'a'.repeat(41) })).toThrow(/between 3 and 40/)
  })

  it('refuses reserved words', () => {
    for (const reserved of ['providers', 'profile', 'auth', 'admin', 'settings']) {
      expect(throws({ slug: reserved }), reserved).toThrow(/reserved/)
    }
  })

  it('catches the short reserved words on length first, which is still a refusal', () => {
    // `p`, `en`, `fr` and the other short reserved names are under the 3-character floor,
    // so they never reach the reserved check. The message differs; the outcome does not.
    expect(throws({ slug: 'p' })).toThrow(/between 3 and 40/)
    expect(throws({ slug: 'en' })).toThrow(/between 3 and 40/)
  })

  /**
   * `server/` cannot import `src/`, so `LOCALE_SLUGS` is a hand-kept twin of `LOCALES`.
   * This is what makes adding a locale without updating it fail here rather than shipping
   * a slug that shadows a language prefix.
   */
  it('reserves every locale code', () => {
    for (const locale of LOCALES) {
      expect(RESERVED_SLUGS.has(locale.toLowerCase()), locale).toBe(true)
    }
  })
})

describe('looksLikeProviderId', () => {
  it('separates the id namespace from the slug namespace', () => {
    expect(looksLikeProviderId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(looksLikeProviderId('acme-hair')).toBe(false)
    // Case-insensitive: a link may be typed or pasted in any case.
    expect(looksLikeProviderId('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })
})
