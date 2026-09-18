'use client'

import { FC } from 'react'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { FieldRequirement } from './FieldLabel'
import { PasswordField } from './PasswordField'

type Props = {
  /** The field this must match. */
  passwordName?: string
  name?: string
  label?: string
  requirement?: FieldRequirement
  disabled?: boolean
}

/**
 * The second input of every new-password pair.
 *
 * Required, and re-validates when the first field changes — `dependencies` is what
 * makes a match that passed once fail again after the original is edited.
 */
export const ConfirmPasswordField: FC<Props> = ({
  passwordName = 'password',
  name = 'confirmPassword',
  label,
  requirement,
  disabled,
}) => {
  const t = useTranslations('Auth')
  const requiredRules = useFormItemRules('required')

  const rules: Rule[] = [
    ...requiredRules,
    ({ getFieldValue }) => ({
      validator: (_, value: string) =>
        !value || getFieldValue(passwordName) === value
          ? Promise.resolve()
          : Promise.reject(new Error(t('validation.passwordsDoNotMatch'))),
    }),
  ]

  return (
    <PasswordField
      name={name}
      label={label ?? t('fields.confirmPassword')}
      requirement={requirement}
      autoComplete='new-password'
      disabled={disabled}
      dependencies={[passwordName]}
      rules={rules}
    />
  )
}
