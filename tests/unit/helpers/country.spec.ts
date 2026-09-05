import { describe, expect, it } from 'vitest'
import { getCountryName } from '@helpers/country'

describe('getCountryName', () => {
  it('renders an ISO code in the requested language', () => {
    expect(getCountryName('DE', 'en')).toBe('Germany')
    expect(getCountryName('DE', 'de')).toBe('Deutschland')
    expect(getCountryName('AM', 'en')).toBe('Armenia')
  })

  // The whole reason countries are stored as codes rather than names: one row
  // reads correctly on all 15 language variants of a provider's page. `DE` rather
  // than `AM` because Armenia is spelled identically in English and Spanish, which
  // would make this assert nothing.
  it('renders the same stored value differently per locale', () => {
    const rendered = ['en', 'es', 'fr', 'ja'].map((locale) => getCountryName('DE', locale))

    expect(rendered).toEqual(['Germany', 'Alemania', 'Allemagne', 'ドイツ'])
  })

  it('accepts a lowercase code', () => {
    expect(getCountryName('de', 'en')).toBe('Germany')
  })

  it('is empty for an absent country', () => {
    expect(getCountryName(undefined, 'en')).toBeUndefined()
    expect(getCountryName(null, 'en')).toBeUndefined()
    expect(getCountryName('   ', 'en')).toBeUndefined()
  })

  // Rows predating the ISO standardisation hold a display name. Passing them through
  // keeps legacy data readable instead of blanking it.
  it('passes a legacy display name through unchanged', () => {
    expect(getCountryName('Armenia', 'en')).toBe('Armenia')
    expect(getCountryName('United Kingdom', 'fr')).toBe('United Kingdom')
  })

  it('falls back to the code rather than throwing on bad input', () => {
    // Unassigned in CLDR, so `of()` hands the input straight back. Note `ZZ` would
    // not work here — it is a real code meaning "Unknown Region".
    expect(getCountryName('QQ', 'en')).toBe('QQ')
    // A structurally invalid tag makes Intl throw RangeError. Note 'not-a-locale'
    // would not work here — it happens to parse as a well-formed BCP-47 tag.
    expect(getCountryName('DE', '!!')).toBe('DE')
    expect(() => getCountryName('DE', '')).not.toThrow()
  })
})
