import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES } from '@i18n/config'
import { matchAcceptLanguage } from '@i18n/matchAcceptLanguage'

describe('matchAcceptLanguage', () => {
  it('falls back to the default locale when the header is absent or empty', () => {
    expect(matchAcceptLanguage(undefined)).toBe(DEFAULT_LOCALE)
    expect(matchAcceptLanguage(null)).toBe(DEFAULT_LOCALE)
    expect(matchAcceptLanguage('')).toBe(DEFAULT_LOCALE)
    expect(matchAcceptLanguage('*')).toBe(DEFAULT_LOCALE)
  })

  it('matches an exact tag, case-insensitively', () => {
    expect(matchAcceptLanguage('es')).toBe('es')
    expect(matchAcceptLanguage('pt-BR')).toBe('pt-BR')
    expect(matchAcceptLanguage('pt-br')).toBe('pt-BR')
    expect(matchAcceptLanguage('ZH-cn')).toBe('zh-CN')
  })

  it('falls back to the primary subtag when the region is not one we ship', () => {
    expect(matchAcceptLanguage('es-419')).toBe('es')
    expect(matchAcceptLanguage('en-GB')).toBe('en')
    expect(matchAcceptLanguage('de-AT')).toBe('de')
  })

  // The reason this is not the BCP-47 "lookup" algorithm. Lookup truncates the
  // *requested* tag — pt-PT becomes pt, we ship no bare pt, and a Portuguese
  // speaker would land in English. Same for zh-TW against zh-CN.
  it('gives a speaker their language even when the region variant differs', () => {
    expect(matchAcceptLanguage('pt-PT')).toBe('pt-BR')
    expect(matchAcceptLanguage('zh-TW')).toBe('zh-CN')
    expect(matchAcceptLanguage('zh-Hant-HK')).toBe('zh-CN')
  })

  it('honours quality values over header order', () => {
    expect(matchAcceptLanguage('de;q=0.5,ja;q=0.9')).toBe('ja')
    expect(matchAcceptLanguage('de;q=0.9,pt-PT;q=1.0')).toBe('pt-BR')
  })

  it('prefers header order when qualities tie', () => {
    expect(matchAcceptLanguage('ko,ja')).toBe('ko')
    expect(matchAcceptLanguage('ja,ko')).toBe('ja')
  })

  // Quality is the outer loop, so the more-preferred tag is fully resolved —
  // exact first, then primary subtag — before a lower-quality tag is considered.
  // A zh-TW reader who ranked Japanese below it gets Simplified Chinese, which
  // is nearer what they asked for than Japanese.
  it('resolves a higher-quality tag by subtag before trying a lower-quality one', () => {
    expect(matchAcceptLanguage('zh-TW;q=0.9,ja;q=0.8')).toBe('zh-CN')
  })

  it('prefers an exact tag over a subtag fallback at equal quality', () => {
    expect(matchAcceptLanguage('ja,zh-TW')).toBe('ja')
  })

  it('skips tags the browser explicitly refuses (q=0)', () => {
    expect(matchAcceptLanguage('ja;q=0,ko;q=0.5')).toBe('ko')
    expect(matchAcceptLanguage('ja;q=0')).toBe(DEFAULT_LOCALE)
  })

  it('ignores languages the app does not ship', () => {
    expect(matchAcceptLanguage('sv-SE,nb;q=0.8')).toBe(DEFAULT_LOCALE)
  })

  it('tolerates whitespace and malformed quality values', () => {
    expect(matchAcceptLanguage('  fr-CA ;  q=0.8 ,  it ; q=nonsense ')).toBe('it')
  })

  it('resolves every shipped locale to itself', () => {
    for (const locale of LOCALES) {
      expect(matchAcceptLanguage(locale)).toBe(locale)
    }
  })
})
