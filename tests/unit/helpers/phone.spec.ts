import { describe, expect, it } from 'vitest'
import { generateFriendlyPhoneNumber, toGuestPhoneNumber } from '@helpers/phone'

describe('generateFriendlyPhoneNumber', () => {
  it('joins a calling code and national number', () => {
    expect(generateFriendlyPhoneNumber({ code: 374, number: 77000201 }, { prefix: '+', delimiter: ' ' })).toBe(
      '+374 77000201'
    )
  })

  it('omits a zero calling code so a guest number is not shown as +0', () => {
    expect(generateFriendlyPhoneNumber({ code: 0, number: 77123456 }, { prefix: '+' })).toBe('77123456')
  })
})

describe('toGuestPhoneNumber', () => {
  it('keeps digits and drops spaces, dashes and a leading plus', () => {
    expect(toGuestPhoneNumber('+374 77-123456')).toEqual({ code: 0, number: 37477123456 })
  })
})
