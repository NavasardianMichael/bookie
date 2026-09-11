'use client'

import { useMemo } from 'react'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@constants/auth'
import { checkPasswordPolicy, PasswordPolicyFailure } from '@helpers/password'

/** Each failure reason maps to one `Auth.validation.*` key. */
const MESSAGE_KEY: Record<PasswordPolicyFailure, string> = {
  required: 'passwordRequired',
  tooShort: 'passwordTooShort',
  tooLong: 'passwordTooLong',
  needsLetterAndNumber: 'passwordNeedsLetterAndNumber',
  containsEmail: 'passwordContainsEmail',
}

/**
 * The password policy as antd `Form` rules, wrapping the pure `checkPasswordPolicy`.
 *
 * One rule rather than five, because the policy is ordered — reporting "must contain a
 * digit" on a three-character password would be noise. The helper returns the *first*
 * failure and this renders only that.
 *
 * @param emailFieldName When given, the password is also checked against that field's value,
 *   matching the server's "must not contain your email address" rule.
 */
export const usePasswordRules = (emailFieldName?: string): Rule[] => {
  const t = useTranslations('Auth.validation')

  return useMemo(
    () => [
      { required: true, message: t('passwordRequired') },
      ({ getFieldValue }) => ({
        validator: (_, value: string) => {
          if (!value) return Promise.resolve()

          const email = emailFieldName ? String(getFieldValue(emailFieldName) ?? '') : undefined
          const failure = checkPasswordPolicy(value, email)
          if (!failure) return Promise.resolve()

          return Promise.reject(
            new Error(t(MESSAGE_KEY[failure], { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH }))
          )
        },
      }),
    ],
    [emailFieldName, t]
  )
}
