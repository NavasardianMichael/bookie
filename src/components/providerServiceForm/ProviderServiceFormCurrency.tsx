'use client'

import { FC } from 'react'
import { AutoComplete } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE } from './constants'

type Props = {
  /** `value` and `onChange` are injected by the wrapping `Form.Item`. */
  value?: string
  onChange?: (next: string) => void
  disabled?: boolean
  id?: string
}

const OPTIONS = PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE ?? []

const matchesQuery = (input: string, option?: DefaultOptionType): boolean => {
  const query = input.trim().toLowerCase()
  if (!query) return true
  const value = String(option?.value ?? '').toLowerCase()
  const label = String(option?.label ?? '').toLowerCase()
  return value.includes(query) || label.includes(query)
}

/**
 * Combobox over the usual ISO currencies, plus free text. An exact match on a code
 * or full name (case-insensitive) canonicalises to the predefined code so "USD" and
 * "usd" and "United States Dollar" store the same value; anything else is saved as typed.
 */
export const ProviderServiceFormCurrency: FC<Props> = ({ value, onChange, disabled, id }) => {
  const handleChange = (next: string | undefined) => {
    const text = next ?? ''
    const query = text.trim().toLowerCase()
    if (!query) {
      onChange?.('')
      return
    }
    const matched = OPTIONS.find((option) => {
      const code = String(option.value ?? '').toLowerCase()
      const label = String(option.label ?? '').toLowerCase()
      return query === code || query === label
    })
    onChange?.(matched ? String(matched.value) : text)
  }

  return (
    <AutoComplete
      id={id}
      value={value}
      onChange={handleChange}
      options={OPTIONS}
      disabled={disabled}
      placeholder='Type or pick a currency'
      allowClear
      showSearch={{ filterOption: matchesQuery }}
      className='w-full'
    />
  )
}
