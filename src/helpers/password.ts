import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@constants/auth'

/** Which rule a password failed, or `null` when it passes. */
export type PasswordPolicyFailure = 'required' | 'tooShort' | 'tooLong' | 'needsLetterAndNumber' | 'containsEmail'

/**
 * The password policy, client side — a pure mirror of `validatePassword` in
 * `server/src/lib/password.ts`.
 *
 * It returns a *reason* rather than a message so the copy stays in the locale catalogues;
 * `usePasswordRules` maps each reason to its `Auth.validation.*` key.
 *
 * **Why this exists at all.** The auth screens first shipped checking only length, while
 * the server also requires a letter and a digit and forbids the email's local part. A
 * password the server rejected therefore passed client validation, submitted, and came back
 * as an error the form had never warned about. A partial mirror is worse than none.
 *
 * The server re-checks everything regardless — this is a courtesy to the user, not a
 * control. Keep the two in step; `tests/unit/helpers/password.spec.ts` pins the cases.
 */
export const checkPasswordPolicy = (password: string, email?: string): PasswordPolicyFailure | null => {
  if (!password) return 'required'
  if (password.length < PASSWORD_MIN_LENGTH) return 'tooShort'
  if (password.length > PASSWORD_MAX_LENGTH) return 'tooLong'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'needsLetterAndNumber'

  // The one guess an attacker always makes. Only from 3 characters up, so a short local
  // part does not ban half the alphabet.
  const localPart = email?.split('@')[0]?.toLowerCase()
  if (localPart && localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    return 'containsEmail'
  }

  return null
}
