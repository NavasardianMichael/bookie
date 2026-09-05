import { describe, expect, it } from 'vitest'
import { toOptionalText, toOrganizationFields, toPhoneNumber } from '@helpers/registration'

describe('toPhoneNumber', () => {
  it('resolves a country to its numeric calling code', () => {
    expect(toPhoneNumber('AM', '77000201')).toEqual({ code: 374, number: 77000201 })
  })

  it('returns numbers, not strings — the server reads phone.number with BigInt', () => {
    const phone = toPhoneNumber('US', '5550000')

    expect(typeof phone.code).toBe('number')
    expect(typeof phone.number).toBe('number')
    expect(phone.code).toBe(1)
  })
})

describe('toOrganizationFields', () => {
  it('sends only the id when an existing organization was picked', () => {
    expect(toOrganizationFields({ id: 'org-1', name: 'Acme Services' })).toEqual({ organizationId: 'org-1' })
  })

  it('sends only the name when the provider typed one that may not exist', () => {
    expect(toOrganizationFields({ name: 'Acme Services' })).toEqual({ organizationName: 'Acme Services' })
  })

  it('trims the typed name so " Acme " and "Acme" cannot become two organizations', () => {
    expect(toOrganizationFields({ name: '  Acme Services  ' })).toEqual({ organizationName: 'Acme Services' })
  })

  it('sends neither field when the value is absent or blank', () => {
    expect(toOrganizationFields(undefined)).toEqual({})
    expect(toOrganizationFields({ name: '' })).toEqual({})
    expect(toOrganizationFields({ name: '   ' })).toEqual({})
  })

  it('prefers the id over the name when both are present', () => {
    // A picked organization's label is redundant, and sending both would let a stale
    // label disagree with the row it points at.
    expect(toOrganizationFields({ id: 'org-1', name: 'Renamed Since' })).toEqual({ organizationId: 'org-1' })
  })
})

describe('toOptionalText', () => {
  it('keeps real text, trimmed', () => {
    expect(toOptionalText('  alex@example.com ')).toBe('alex@example.com')
  })

  it('collapses blank and missing input to undefined, never an empty string', () => {
    expect(toOptionalText('')).toBeUndefined()
    expect(toOptionalText('   ')).toBeUndefined()
    expect(toOptionalText(undefined)).toBeUndefined()
  })
})
