'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { usePasswordRules } from '@hooks/usePasswordRules'
import { ConfirmPasswordField } from './ConfirmPasswordField'
import { FieldRequirement } from './FieldLabel'
import { PasswordField } from './PasswordField'

type Props = {
  /**
   * When set, the new password is also checked against that field's value, matching
   * the server's "must not contain your email address" rule.
   */
  emailFieldName?: string
  passwordName?: string
  confirmName?: string
  passwordLabel?: string
  confirmLabel?: string
  placeholder?: string
  requirement?: FieldRequirement
  disabled?: boolean
}

/**
 * The two inputs that choose a password — registration, reset, and any later change
 * form. Sign-in is the exception: it asks for the existing password once.
 *
 * A fragment so both fields take part in the parent form's `gap` the same way a
 * hand-rolled pair would.
 */
export const NewPasswordFields: FC<Props> = ({
  emailFieldName,
  passwordName = 'password',
  confirmName = 'confirmPassword',
  passwordLabel,
  confirmLabel,
  placeholder,
  requirement,
  disabled,
}) => {
  const t = useTranslations('Auth')
  const passwordRules = usePasswordRules(emailFieldName)

  return (
    <>
      <PasswordField
        name={passwordName}
        label={passwordLabel ?? t('fields.password')}
        placeholder={placeholder}
        requirement={requirement}
        autoComplete='new-password'
        disabled={disabled}
        rules={passwordRules}
      />
      <ConfirmPasswordField
        passwordName={passwordName}
        name={confirmName}
        label={confirmLabel}
        requirement={requirement}
        disabled={disabled}
      />
    </>
  )
}
