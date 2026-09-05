'use client'

import { FC, useCallback } from 'react'
import { Form, Select, Space } from 'antd'
import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/form'
import { AppInput } from '@components/ui/AppInput'
import { PhoneIcon } from '@components/ui/icons'
import { FieldLabel, FieldRequirement } from './FieldLabel'
import { useCountries } from './useCountries'

export type PhoneFormValues = {
  code: CountryCode | undefined
  number: string
}

type Props = {
  /** The prototypes label this differently per role. */
  label: string
  requirement?: FieldRequirement
  placeholder?: string
  disabled?: boolean
  /** The provider prototype labels fields in navy semibold rather than charcoal bold. */
  labelClassName?: string
}

const NUMBER_INPUT_ID = 'phone-number'

/**
 * The country-code + number pair, shared by both registration forms and by sign-in.
 *
 * The prototypes draw one input with a `+1 (555) 000-0000` placeholder, but a single free
 * text field cannot be validated against a country's real numbering plan. The country
 * `Select` therefore stays, joined to the number by `Space.Compact` so the pair still reads
 * as the one control the design shows.
 */
export const PhoneNumberField: FC<Props> = ({
  label,
  requirement,
  placeholder = '+1 (555) 000-0000',
  disabled,
  labelClassName,
}) => {
  const countries = useCountries()
  const countryCode = Form.useWatch<CountryCode | undefined>('code')

  const validatePhoneNumber = useCallback(
    (_: unknown, value: string) => {
      if (!value || !countryCode) return Promise.resolve()
      try {
        if (isValidPhoneNumber(`+${getCountryCallingCode(countryCode)}${value}`)) return Promise.resolve()
        return Promise.reject(new Error('Please enter a valid phone number'))
      } catch {
        return Promise.reject(new Error('Please enter a valid phone number'))
      }
    },
    [countryCode]
  )

  return (
    <div className='flex flex-col gap-1.5'>
      <FieldLabel htmlFor={NUMBER_INPUT_ID} requirement={requirement} className={labelClassName}>
        {label}
      </FieldLabel>

      <Space.Compact className='w-full'>
        <Form.Item<PhoneFormValues>
          name='code'
          messageVariables={{ label: 'Country Code' }}
          rules={FORM_ITEM_REQUIRED_RULE_SET}
          validateTrigger={['onChange']}
          className='w-30 shrink-0'
        >
          <Select
            options={countries}
            labelRender={(option) => option.label}
            showSearch
            optionFilterProp='label'
            popupMatchSelectWidth={320}
            disabled={disabled}
            aria-label='Country code'
          />
        </Form.Item>

        <Form.Item<PhoneFormValues>
          name='number'
          messageVariables={{ label: 'phone number' }}
          rules={[...FORM_ITEM_REQUIRED_RULE_SET, { validator: validatePhoneNumber }]}
          className='grow'
        >
          <AppInput
            id={NUMBER_INPUT_ID}
            type='tel'
            disabled={disabled}
            placeholder={placeholder}
            inputMode='numeric'
            autoComplete='tel-national'
            enterKeyHint='next'
            prefix={<PhoneIcon className='text-brand-muted h-4 w-4' />}
          />
        </Form.Item>
      </Space.Compact>
    </div>
  )
}
