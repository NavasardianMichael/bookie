'use client'

import { FC } from 'react'
import { Input } from 'antd'
import type { Rule } from 'antd/es/form'
import { AppFormItem } from '@components/ui/AppFormItem'
import { LockIcon } from '@components/ui/icons'
import { FieldLabel, FieldRequirement } from './FieldLabel'

type Props = {
  name: string
  label: string
  placeholder?: string
  rules?: Rule[]
  requirement?: FieldRequirement
  requirementText?: string
  /** `new-password` on registration and reset, `current-password` at sign-in. */
  autoComplete: 'new-password' | 'current-password'
  disabled?: boolean
  /** Passed to `Form.Item` so a confirm field re-validates when the password changes. */
  dependencies?: string[]
}

/**
 * A password input with antd's own reveal toggle.
 *
 * `Input.Password` rather than `AppInput type='password'`: the eye toggle is the part users
 * actually need on a field they cannot read back, and antd already handles its a11y label
 * and the focus behaviour that comes with swapping the input's type.
 *
 * Label through `FieldLabel` with an explicit `htmlFor`, matching the rest of the funnel —
 * so `messageVariables` must be passed for the `'Please fill in ${label}'` rule to resolve.
 */
export const PasswordField: FC<Props> = ({
  name,
  label,
  placeholder,
  rules,
  requirement,
  requirementText,
  autoComplete,
  disabled,
  dependencies,
}) => (
  <div className='flex flex-col gap-1.5'>
    <FieldLabel htmlFor={name} requirement={requirement} requirementText={requirementText}>
      {label}
    </FieldLabel>

    <AppFormItem name={name} rules={rules} messageVariables={{ label }} dependencies={dependencies}>
      <Input.Password
        id={name}
        size='large'
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        prefix={<LockIcon className='text-brand-muted h-4 w-4' />}
      />
    </AppFormItem>
  </div>
)
