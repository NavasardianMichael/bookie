import { describe, expect, it } from 'vitest'
import { getPhoneNumberPattern, isValidNationalPhoneNumber, toE164PhoneNumber } from '@helpers/phoneValidation'

describe('getPhoneNumberPattern', () => {
  it("masks the country's own grouping behind its dialling code", () => {
    expect(getPhoneNumberPattern('AM')).toBe('+374 XX XXXXXX')
    expect(getPhoneNumberPattern('US')).toBe('+1 XXX XXX XXXX')
    expect(getPhoneNumberPattern('DE')).toBe('+49 XXXX XXXXXXX')
  })

  it('never masks the dialling code itself', () => {
    expect(getPhoneNumberPattern('AE')).toMatch(/^\+971 /)
  })
})

describe('isValidNationalPhoneNumber', () => {
  it('accepts a complete number for the picked country', () => {
    expect(isValidNationalPhoneNumber('AM', '77123456')).toBe(true)
  })

  it('refuses the first digits of one — the case that used to error on the first keystroke', () => {
    expect(isValidNationalPhoneNumber('AM', '7')).toBe(false)
    expect(isValidNationalPhoneNumber('AM', '771234')).toBe(false)
  })

  it('refuses text that is not a number rather than throwing', () => {
    expect(isValidNationalPhoneNumber('AM', 'abc')).toBe(false)
  })
})

describe('toE164PhoneNumber', () => {
  it("prefixes the picked country's dialling code, ignoring spacing", () => {
    expect(toE164PhoneNumber('AM', '10 222333')).toBe('+37410222333')
  })

  it('agrees with isValidNationalPhoneNumber, so an accepted number is never dropped', () => {
    for (const [country, number] of [
      ['AM', '77123456'],
      ['US', '2015550123'],
      ['DE', '15123456789'],
    ] as const) {
      expect(isValidNationalPhoneNumber(country, number)).toBe(true)
      expect(toE164PhoneNumber(country, number)).toBeDefined()
    }
  })

  it('returns undefined for a number that is not valid', () => {
    expect(toE164PhoneNumber('AM', '12')).toBeUndefined()
    expect(toE164PhoneNumber('AM', '')).toBeUndefined()
  })
})
