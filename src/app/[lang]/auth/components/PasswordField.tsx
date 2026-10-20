'use client'

import { FC, useState } from 'react'
import { Input } from 'antd'
import type { Rule } from 'antd/es/form'
import { AppFormItem } from '@components/ui/AppFormItem'
import { LockIcon } from '@components/ui/icons'
import { FieldLabel, FieldRequirement } from './FieldLabel'

type Props = {
  name: string
  /** Defaults to `name`. Account deletion sets its own so the browser does not treat it as sign-in. */
  id?: string
  label: string
  placeholder?: string
  rules?: Rule[]
  requirement?: FieldRequirement
  /**
   * `new-password` only through `NewPasswordFields` (registration, reset, change).
   * Sign-in re-enters an existing password (`current-password`). Account deletion
   * uses `off`: browsers ignore that token on a password input, so the field also
   * stays read-only until it is focused, which is what stops the saved password landing.
   */
  autoComplete: 'new-password' | 'current-password' | 'off'
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
  id,
  label,
  placeholder,
  rules,
  requirement,
  autoComplete,
  disabled,
  dependencies,
}) => {
  const inputId = id ?? name
  // `off` is ignored on `type="password"`. Read-only until focus is what the browser
  // actually respects: it fills on first paint, and a read-only input is skipped.
  const blockFill = autoComplete === 'off'
  const [editable, setEditable] = useState(!blockFill)

  return (
    <div className='flex flex-col gap-1.5'>
      <FieldLabel htmlFor={inputId} requirement={requirement}>
        {label}
      </FieldLabel>

      <AppFormItem name={name} rules={rules} messageVariables={{ label }} dependencies={dependencies}>
        <Input.Password
          id={inputId}
          name={blockFill ? inputId : undefined}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={blockFill && !editable}
          onFocus={() => {
            if (blockFill) setEditable(true)
          }}
          disabled={disabled}
          prefix={<LockIcon className='text-brand-muted h-4 w-4' />}
        />
      </AppFormItem>
    </div>
  )
}
