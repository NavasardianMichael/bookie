import { describe, expect, it } from 'vitest'
// Aliased, deliberately: the server cap and the web form rule are two halves of one
// agreement with no shared type, so the web constant is the thing under test.
import { MAX_CHARS_FOR_NAME } from '@constants/form'
// Relative, not aliased: `server/` is a separate package. `request.ts` imports nothing,
// which is what keeps it reachable here.
import { asFullName, MAX_FULL_NAME_LENGTH } from '../../../server/src/lib/request'

/**
 * `Provider.fullName`, `Consumer.fullName` and `Appointment.guestFullName` are written
 * through `asFullName` alone. A name that two people type differently by whitespace alone
 * would otherwise sort and search as two different names.
 */
describe('asFullName', () => {
  it('refuses anything that is not a string', () => {
    expect(asFullName(undefined)).toBeUndefined()
    expect(asFullName(null)).toBeUndefined()
    expect(asFullName(42)).toBeUndefined()
    expect(asFullName(['Anna', 'Petrosyan'])).toBeUndefined()
    expect(asFullName({ firstName: 'Anna' })).toBeUndefined()
  })

  // Each route words its own 400 for a missing name, so "nothing left" must be undefined,
  // never an empty string that would pass a presence check.
  it('is undefined when nothing but whitespace is left', () => {
    expect(asFullName('')).toBeUndefined()
    expect(asFullName('   ')).toBeUndefined()
    expect(asFullName('\t\n ')).toBeUndefined()
  })

  it('trims, and collapses every run of whitespace to one space', () => {
    expect(asFullName('  Anna   Petrosyan  ')).toBe('Anna Petrosyan')
    expect(asFullName('Anna\tMaria\n\nPetrosyan')).toBe('Anna Maria Petrosyan')
  })

  it('keeps the name as written — no reordering, no case change', () => {
    expect(asFullName('PETROSYAN anna')).toBe('PETROSYAN anna')
    expect(asFullName('Nguyễn Văn An')).toBe('Nguyễn Văn An')
  })

  it('caps at the limit rather than rejecting', () => {
    const long = 'a'.repeat(MAX_FULL_NAME_LENGTH + 20)
    expect(asFullName(long)).toBe('a'.repeat(MAX_FULL_NAME_LENGTH))
  })

  it('leaves no trailing space where the cap falls just after a word', () => {
    const word = 'a'.repeat(MAX_FULL_NAME_LENGTH - 1)
    const capped = asFullName(`${word} Petrosyan`)
    expect(capped).toBe(word)
    expect(capped?.endsWith(' ')).toBe(false)
  })

  it('counts the cap after collapsing, so padding cannot push the name out', () => {
    const padded = `Anna${' '.repeat(200)}Petrosyan`
    expect(asFullName(padded)).toBe('Anna Petrosyan')
  })

  it('agrees with the web form rule on how long a name may be', () => {
    expect(MAX_FULL_NAME_LENGTH).toBe(MAX_CHARS_FOR_NAME)
  })
})
