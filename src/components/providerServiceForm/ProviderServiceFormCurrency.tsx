'use client'

import { FC } from 'react'
import { AutoComplete } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { useTranslations } from 'next-intl'
import { isSameName, matchesSearch } from '@helpers/search'
import { PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE } from './constants'

type Props = {
  /** `value` and `onChange` are injected by the wrapping `Form.Item`. */
  value?: string
  onChange?: (next: string) => void
  disabled?: boolean
  id?: string
}

const OPTIONS = PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE ?? []

/** Code or name; case, accents and spacing ignored, a typo or two tolerated. */
const matchesQuery = (input: string, option?: DefaultOptionType): boolean =>
  matchesSearch(String(option?.value ?? ''), input) || matchesSearch(String(option?.label ?? ''), input)

/**
 * Combobox over the usual ISO currencies, plus free text. The same code or full name,
 * however cased or spaced (`isSameName`), canonicalises to the predefined code so "USD",
 * " usd" and "united states dollar" store the same value; anything else is saved as typed.
 */
export const ProviderServiceFormCurrency: FC<Props> = ({ value, onChange, disabled, id }) => {
  const t = useTranslations('Services')
  const handleChange = (next: string | undefined) => {
    const text = next ?? ''
    if (!text.trim()) {
      onChange?.('')
      return
    }
    const matched = OPTIONS.find(
      (option) => isSameName(String(option.value ?? ''), text) || isSameName(String(option.label ?? ''), text)
    )
    onChange?.(matched ? String(matched.value) : text)
  }

  return (
    <AutoComplete
      id={id}
      value={value}
      onChange={handleChange}
      options={OPTIONS}
      disabled={disabled}
      placeholder={t('currencyPlaceholder')}
      allowClear
      showSearch={{ filterOption: matchesQuery }}
      className='w-full'
    />
  )
}
