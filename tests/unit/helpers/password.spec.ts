import { describe, expect, it } from 'vitest'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@constants/auth'
import { checkPasswordPolicy } from '@helpers/password'

/**
 * This is the **client half** of a policy that also lives in
 * `server/src/lib/password.ts#validatePassword`. Keep the two in step: the auth screens
 * first shipped checking only length, so a password the server rejected for having no digit
 * passed client validation and came back as an error the form had never warned about.
 *
 * `password.ts` on the server cannot be imported here — it pulls in `@node-rs/argon2`, whose
 * `Algorithm` is an ambient const enum that `isolatedModules` refuses. So these cases are
 * written to mirror it rather than to call it; the server re-checks everything regardless.
 */
describe('checkPasswordPolicy', () => {
  it('accepts letters and digits at the minimum length', () => {
    expect(checkPasswordPolicy('abcdefg1')).toBeNull()
  })

  it('reports a missing password', () => {
    expect(checkPasswordPolicy('')).toBe('required')
  })

  it('reports length before composition, so a short password is not also told about digits', () => {
    expect(checkPasswordPolicy('ab1')).toBe('tooShort')
  })

  it('reports a password over the maximum', () => {
    expect(checkPasswordPolicy('a1'.repeat(PASSWORD_MAX_LENGTH))).toBe('tooLong')
  })

  // The two cases the original length-only rules let through.
  it.each([
    ['letters only', 'abcdefghij'],
    ['digits only', '1234567890'],
  ])('reports %s', (_label, input) => {
    expect(checkPasswordPolicy(input)).toBe('needsLetterAndNumber')
  })

  it("reports a password containing the email's local part", () => {
    expect(checkPasswordPolicy('alexmorgan1', 'alexmorgan@example.com')).toBe('containsEmail')
  })

  it('is case-insensitive about that', () => {
    expect(checkPasswordPolicy('ALEXMORGAN1', 'alexmorgan@example.com')).toBe('containsEmail')
  })

  // Only from 3 characters up, so a short local part does not ban half the alphabet.
  it('ignores a local part shorter than three characters', () => {
    expect(checkPasswordPolicy('about1234', 'ab@example.com')).toBeNull()
  })

  it('allows a password that merely shares the domain', () => {
    expect(checkPasswordPolicy('example1234', 'alex@other.com')).toBeNull()
  })

  it('skips the email check when no email is supplied', () => {
    expect(checkPasswordPolicy('alexmorgan1')).toBeNull()
  })

  it('uses the shared constants rather than its own numbers', () => {
    expect(checkPasswordPolicy('a1'.repeat(Math.floor(PASSWORD_MIN_LENGTH / 2)))).toBeNull()
  })
})
