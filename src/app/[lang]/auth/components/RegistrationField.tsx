'use client'

import { FC, ReactNode } from 'react'
import type { Rule } from 'antd/es/form'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { FieldLabel, FieldRequirement } from './FieldLabel'

type Props = {
  name: string
  label: string
  placeholder: string
  icon: ReactNode
  rules?: Rule[]
  requirement?: FieldRequirement
  type?: 'text' | 'email'
  autoComplete?: string
  disabled?: boolean
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
  autoComplete,
  disabled,
  labelClassName,
}) => (
  <div className='flex flex-col gap-1.5'>
    <FieldLabel htmlFor={name} requirement={requirement} className={labelClassName}>
      {label}
    </FieldLabel>

    <AppFormItem name={name} rules={rules} messageVariables={{ label }}>
      <AppInput
        id={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        enterKeyHint='next'
        disabled={disabled}
        prefix={icon}
      />
    </AppFormItem>
  </div>
)
