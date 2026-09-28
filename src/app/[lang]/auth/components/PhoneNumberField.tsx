'use client'

import { FC, useEffect, useMemo } from 'react'
import { Form, Select, Space } from 'antd'
import type { Rule } from 'antd/es/form'
import type { NamePath } from 'antd/es/form/interface'
import type { DefaultOptionType } from 'antd/es/select'
import type { CountryCode } from 'libphonenumber-js'
import { useLocale, useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useValidateAfterSubmit } from '@hooks/useValidateAfterSubmit'
import { guessPhoneCountry } from '@helpers/country'
import { getPhoneNumberPattern, isValidNationalPhoneNumber } from '@helpers/phoneValidation'
import { matchesSearch } from '@helpers/search'
import { AppInput } from '@components/ui/AppInput'
import { PhoneIcon } from '@components/ui/icons'
import { Country } from './Country'
import { FieldLabel, FieldRequirement } from './FieldLabel'
import { useCountries } from './useCountries'

export type PhoneFormValues = {
  code: CountryCode | undefined
  number: string
}

/** Where the pair lives in the form. Declare it at module scope — it is an effect dependency. */
export type PhoneFieldNames = {
  code: NamePath
  number: NamePath
}

const DEFAULT_NAMES: PhoneFieldNames = { code: 'code', number: 'number' }

/** "+374", "armenia", "armnia" and "AM" all find Armenia. */
const matchesCountry = (input: string, option?: DefaultOptionType): boolean =>
  matchesSearch(String(option?.searchLabel ?? ''), input)

type Props = {
  /** The prototypes label this differently per role. */
  label: string
  requirement?: FieldRequirement
  placeholder?: string
  disabled?: boolean
  /** The provider prototype labels fields in navy semibold rather than charcoal bold. */
  labelClassName?: string
  /**
   * When false, an empty number is valid and the country picker is only required if a
   * number was typed. Defaults to true — every registration path needs a number.
   */
  required?: boolean
  /** Defaults to the top-level `code` / `number` of `PhoneFormValues`. */
  names?: PhoneFieldNames
  /** Must be unique on the page when the field appears twice. */
  inputId?: string
  /** Preselected instead of guessing from the browser's languages. */
  defaultCountry?: CountryCode
  /** False drops both values when the field unmounts, for a field inside a disclosure. */
  preserve?: boolean
}

// Space.Compact overlaps sibling controls by 1px; Form.Item wrappers sit between
// these two, so the Select's end edge stays drawn against the number field.
const compactSelectStyles = {
  root: {
    borderInlineEndWidth: 0,
    borderStartEndRadius: 0,
    borderEndEndRadius: 0,
  },
}
const compactInputStyles = {
  root: {
    borderStartStartRadius: 0,
    borderEndStartRadius: 0,
  },
}

/**
 * The country-code + number pair, shared by both registration forms, the Google completion
 * step, the profile's change-phone field, and a new organization's optional phone (under
 * `names` of its own, preselecting the provider's country).
 *
 * The prototypes draw one input with a `+1 (555) 000-0000` placeholder, but a single free
 * text field cannot be validated against a country's real numbering plan. The country
 * `Select` therefore stays, joined to the number by `Space.Compact` so the pair still reads
 * as the one control the design shows.
 *
 * **The number is checked on submit, not per keystroke** (`useValidateAfterSubmit`). A
 * number is invalid at every digit but the last, so validating on change greeted the first
 * digit typed with an error. After a failed submit it re-checks as the user types, and
 * re-checks when the country changes too — only then, because `dependencies` validates a
 * field with an initial value even if nobody has touched it, and both registration forms
 * seed `number: ''`.
 *
 * The validator reads the country through `getFieldValue` rather than `useWatch`: a
 * dependency re-check runs before this component re-renders with the new country.
 */
export const PhoneNumberField: FC<Props> = ({
  label,
  requirement,
  placeholder = '+1 (555) 000-0000',
  disabled,
  labelClassName,
  required = true,
  names = DEFAULT_NAMES,
  inputId = 'phone-number',
  defaultCountry,
  preserve,
}) => {
  const t = useTranslations('Auth')
  const form = Form.useFormInstance()
  const locale = useLocale()
  const countries = useCountries()
  const countryCode = Form.useWatch<CountryCode | undefined>(names.code)
  const numberValue = Form.useWatch<string | undefined>(names.number)
  const allowedCountries = useMemo(() => new Set(countries.map((country) => country.value)), [countries])
  const requiredRules = useFormItemRules('required')
  const { validateTrigger, isLive, markChecked } = useValidateAfterSubmit()
  const countryLabel = t('fields.countryCode')

  // After mount so `navigator.languages` cannot disagree with the server HTML.
  // Leaves an existing value alone — registration, Google completion, and change-phone all
  // share this field, and change-phone may already know the current country.
  useEffect(() => {
    if (countryCode) return
    const tags = typeof navigator !== 'undefined' ? [...navigator.languages, locale] : [locale]
    const guessed = defaultCountry ?? guessPhoneCountry(tags, allowedCountries)
    if (guessed) form.setFieldValue(names.code, guessed)
  }, [allowedCountries, countryCode, defaultCountry, form, locale, names.code])

  const numberRules = useMemo<Rule[]>(
    () => [
      ...(required ? requiredRules : []),
      ({ getFieldValue }) => ({
        validator: (_: unknown, value: string | undefined) => {
          markChecked()
          const digits = value?.trim()
          const country = getFieldValue(names.code) as CountryCode | undefined
          // A blank number is the `required` rule's call; a missing country is the
          // country item's own error, not a second one here.
          if (!digits || !country || isValidNationalPhoneNumber(country, digits)) return Promise.resolve()

          const pattern = getPhoneNumberPattern(country)
          const message = pattern
            ? t('validation.invalidPhoneFormat', { example: pattern })
            : t('validation.invalidPhone')
          return Promise.reject(new Error(message))
        },
      }),
    ],
    [markChecked, names.code, required, requiredRules, t]
  )

  const codeRequired = required || Boolean(numberValue?.trim())

  return (
    <div className='flex flex-col gap-1.5'>
      <FieldLabel htmlFor={inputId} requirement={requirement} className={labelClassName}>
        {label}
      </FieldLabel>

      <Space.Compact className='w-full'>
        <Form.Item
          name={names.code}
          messageVariables={{ label: countryLabel }}
          rules={codeRequired ? requiredRules : []}
          validateTrigger={['onChange']}
          preserve={preserve}
          className='w-30 shrink-0'
        >
          <Select<CountryCode>
            options={countries}
            labelRender={(option) => <Country country={option.value as CountryCode} />}
            showSearch={{ filterOption: matchesCountry }}
            popupMatchSelectWidth={320}
            disabled={disabled}
            aria-label={countryLabel}
            styles={compactSelectStyles}
          />
        </Form.Item>

        <Form.Item
          name={names.number}
          messageVariables={{ label }}
          rules={numberRules}
          validateTrigger={validateTrigger}
          dependencies={isLive ? [names.code] : undefined}
          preserve={preserve}
          className='grow'
        >
          <AppInput
            id={inputId}
            type='tel'
            disabled={disabled}
            placeholder={placeholder}
            inputMode='numeric'
            autoComplete='tel-national'
            enterKeyHint='next'
            prefix={<PhoneIcon className='text-brand-muted h-4 w-4' />}
            styles={compactInputStyles}
          />
        </Form.Item>
      </Space.Compact>
    </div>
  )
}
