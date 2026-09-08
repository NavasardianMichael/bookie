'use client'

import { FC, useCallback, useEffect, useMemo } from 'react'
import { Form, Select, Space } from 'antd'
import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import { useLocale } from 'next-intl'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/form'
import { guessPhoneCountry } from '@helpers/country'
import { AppInput } from '@components/ui/AppInput'
import { PhoneIcon } from '@components/ui/icons'
import { Country } from './Country'
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
  /** Localised badge text; `requirement` still decides the tone. See `FieldLabel`. */
  requirementText?: string
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
  requirementText,
  placeholder = '+1 (555) 000-0000',
  disabled,
  labelClassName,
}) => {
  const form = Form.useFormInstance<PhoneFormValues>()
  const locale = useLocale()
  const countries = useCountries()
  const countryCode = Form.useWatch<CountryCode | undefined>('code')
  const allowedCountries = useMemo(() => new Set(countries.map((country) => country.value)), [countries])

  // After mount so `navigator.languages` cannot disagree with the server HTML.
  // Leaves an existing value alone — sign-in, registration, and change-phone all
  // share this field, and change-phone may already know the current country.
  useEffect(() => {
    if (countryCode) return
    const tags = typeof navigator !== 'undefined' ? [...navigator.languages, locale] : [locale]
    const guessed = guessPhoneCountry(tags, allowedCountries)
    if (guessed) form.setFieldValue('code', guessed)
  }, [allowedCountries, countryCode, form, locale])

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
      <FieldLabel
        htmlFor={NUMBER_INPUT_ID}
        requirement={requirement}
        requirementText={requirementText}
        className={labelClassName}
      >
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
          <Select<CountryCode>
            options={countries}
            labelRender={(option) => <Country country={option.value as CountryCode} />}
            showSearch={{ optionFilterProp: 'searchLabel' }}
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
