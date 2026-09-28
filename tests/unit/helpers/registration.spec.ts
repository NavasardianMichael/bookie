import { describe, expect, it } from 'vitest'
import {
  toOptionalPhoneNumber,
  toOptionalText,
  toOrganizationFields,
  toPhoneFormValues,
  toPhoneNumber,
} from '@helpers/registration'

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

describe('toOptionalPhoneNumber', () => {
  it('returns undefined when the number is blank, so an optional field can be skipped', () => {
    expect(toOptionalPhoneNumber('AM', '')).toBeUndefined()
    expect(toOptionalPhoneNumber('AM', '   ')).toBeUndefined()
    expect(toOptionalPhoneNumber(undefined, '77000201')).toBeUndefined()
  })

  it('strips non-digits and otherwise matches toPhoneNumber', () => {
    expect(toOptionalPhoneNumber('AM', '77 000 201')).toEqual(toPhoneNumber('AM', '77000201'))
  })
})

describe('toPhoneFormValues', () => {
  it('recovers the ISO country and national number from the API shape', () => {
    expect(toPhoneFormValues({ code: 374, number: 77000201 })).toEqual({ code: 'AM', number: '77000201' })
  })

  it('accepts a +prefixed string the same way', () => {
    expect(toPhoneFormValues('+37477000201')).toEqual({ code: 'AM', number: '77000201' })
  })

  it('returns undefined when there is nothing to parse', () => {
    expect(toPhoneFormValues(undefined)).toBeUndefined()
    expect(toPhoneFormValues('')).toBeUndefined()
  })
})

describe('toOrganizationFields', () => {
  it('sends only the id when an existing organization was picked', () => {
    expect(toOrganizationFields({ id: 'org-1', name: 'Acme Services' }, undefined)).toEqual({
      organizationId: 'org-1',
    })
  })

  it('prefers the id over everything else, including new-organization details left behind', () => {
    // A picked organization's label is redundant, and sending both would let a stale
    // label disagree with the row it points at.
    expect(
      toOrganizationFields({ id: 'org-1', name: 'Renamed Since', isNew: true }, { address: '7 Baghramyan Ave' })
    ).toEqual({ organizationId: 'org-1' })
  })

  it('sends a new organization with its details, trimmed', () => {
    expect(
      toOrganizationFields(
        { name: '  Acme Services  ', isNew: true },
        {
          description: '  Hair and nails ',
          address: ' 7 Baghramyan Ave ',
          phoneCode: 'AM',
          phoneNumber: '10 222333',
          website: 'acme.am',
        }
      )
    ).toEqual({
      newOrganization: {
        name: 'Acme Services',
        description: 'Hair and nails',
        address: '7 Baghramyan Ave',
        phone: '+37410222333',
        website: 'https://acme.am',
      },
    })
  })

  it("builds the phone from the organization's own country picker", () => {
    const fields = toOrganizationFields({ name: 'Acme', isNew: true }, { phoneCode: 'DE', phoneNumber: '30 1234567' })
    expect(fields.newOrganization?.phone).toBe('+49301234567')
  })

  it('sends no phone for a country with no number, or an invalid one', () => {
    expect(
      toOrganizationFields({ name: 'Acme', isNew: true }, { phoneCode: 'AM' }).newOrganization?.phone
    ).toBeUndefined()
    expect(
      toOrganizationFields({ name: 'Acme', isNew: true }, { phoneCode: 'AM', phoneNumber: '12' }).newOrganization?.phone
    ).toBeUndefined()
  })

  it('leaves blank details out rather than sending empty strings', () => {
    expect(toOrganizationFields({ name: 'Acme', isNew: true }, { description: '  ', phoneNumber: '' })).toEqual({
      newOrganization: {
        name: 'Acme',
        description: undefined,
        address: undefined,
        phone: undefined,
        website: undefined,
      },
    })
  })

  it('sends nothing for typed text that was never resolved into a pick or "add as new"', () => {
    // Validation refuses this state; the payload must not guess an organization out of it.
    expect(toOrganizationFields({ name: 'Acme Services' }, undefined)).toEqual({})
  })

  it('sends neither field when the section is closed or the name is blank', () => {
    expect(toOrganizationFields(undefined, undefined)).toEqual({})
    expect(toOrganizationFields({ name: '   ', isNew: true }, undefined)).toEqual({})
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
