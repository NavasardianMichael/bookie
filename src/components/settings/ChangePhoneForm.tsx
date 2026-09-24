'use client'

import { FC } from 'react'
import { PhoneNumberField } from '@app/[lang]/auth/components/PhoneNumberField'
import type { CountryCode } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { PhoneNumber } from '@interfaces/app'
import { toOptionalPhoneNumber, toPhoneFormValues, toPhoneNumber } from '@helpers/registration'

type Props = {
  /** Provider phone is optional; a consumer account always has one. */
  required?: boolean
  disabled?: boolean
}

const isSamePhone = (current: PhoneNumber | string | undefined, next: PhoneNumber): boolean => {
  const values = toPhoneFormValues(current)
  if (!values) return false
  const currentAsPhone = toPhoneNumber(values.code, values.number)
  return currentAsPhone.code === next.code && currentAsPhone.number === next.number
}

/**
 * The phone the profile save should write, or `undefined` when the field is blank
 * or still the number already stored. `PATCH /identity/phone` cannot clear a number,
 * so a blank optional field is left alone.
 */
export const phoneChangeToSave = (
  current: PhoneNumber | string | undefined,
  code: CountryCode | undefined,
  number: string | undefined
): PhoneNumber | undefined => {
  const next = toOptionalPhoneNumber(code, number)
  if (!next || isSamePhone(current, next)) return undefined
  return next
}

/**
 * Phone fields for the profile form. No form of its own and no save button — `code` and
 * `number` register on the surrounding profile `Form`, and that form's save writes them.
 */
export const ChangePhoneForm: FC<Props> = ({ required = true, disabled }) => {
  const t = useTranslations('Settings.phone')

  return <PhoneNumberField label={t('label')} required={required} disabled={disabled} />
}
