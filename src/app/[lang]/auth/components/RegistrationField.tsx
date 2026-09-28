'use client'

import { FC, ReactNode } from 'react'
import type { FormItemProps, Rule } from 'antd/es/form'
import type { InputProps } from 'antd/es/input'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { FieldLabel, FieldRequirement } from './FieldLabel'

type Props = {
  /** A path (`['newOrganization', 'address']`) for a nested value; the input id joins it. */
  name: string | string[]
  label: string
  placeholder: string
  icon: ReactNode
  rules?: Rule[]
  requirement?: FieldRequirement
  /**
   * No `'url'`: the browser's own check for it blocks the submit before antd validates, and
   * rejects a bare `acme.am`. A website is `type='text'` with `inputMode='url'` instead.
   */
  type?: 'text' | 'email'
  inputMode?: InputProps['inputMode']
  autoComplete?: string
  disabled?: boolean
  maxLength?: number
  /** Overrides `AppFormItem`'s on-change trigger — see `useValidateAfterSubmit`. */
  validateTrigger?: FormItemProps['validateTrigger']
  /** False drops the value when the field unmounts, for a field inside a disclosure. */
  preserve?: boolean
  /** The provider prototype labels fields in navy semibold rather than charcoal bold. */
  labelClassName?: string
}

/**
 * One labelled text input, as both prototypes draw them: bold label row on top, icon inside
 * the input's leading edge.
 *
 * The label is rendered by `FieldLabel` and bound with `htmlFor`, so `AppFormItem` gets no
 * `label` of its own — which means `messageVariables` has to be passed explicitly for the
 * `'Please fill in ${label}'` rule message to resolve. `AppFormItem` spreads its props last,
 * so this override lands.
 */
export const RegistrationField: FC<Props> = ({
  name,
  label,
  placeholder,
  icon,
  rules,
  requirement,
  type = 'text',
  inputMode,
  autoComplete,
  disabled,
  maxLength,
  validateTrigger,
  preserve,
  labelClassName,
}) => {
  const id = Array.isArray(name) ? name.join('-') : name

  return (
    <div className='flex flex-col gap-1.5'>
      <FieldLabel htmlFor={id} requirement={requirement} className={labelClassName}>
        {label}
      </FieldLabel>

      <AppFormItem
        name={name}
        rules={rules}
        messageVariables={{ label }}
        preserve={preserve}
        {...(validateTrigger !== undefined && { validateTrigger })}
      >
        <AppInput
          id={id}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete={autoComplete}
          enterKeyHint='next'
          disabled={disabled}
          maxLength={maxLength}
          prefix={icon}
        />
      </AppFormItem>
    </div>
  )
}
