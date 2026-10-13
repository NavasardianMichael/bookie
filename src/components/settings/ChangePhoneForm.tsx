'use client'

import { FC } from 'react'
import { PhoneNumberField } from '@app/[lang]/auth/components/PhoneNumberField'
import type { CountryCode } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { PhoneNumber } from '@interfaces/app'
import { toOptionalPhoneNumber, toPhoneFormValues, toPhoneNumber } from '@helpers/registration'

type Props = {
  disabled?: boolean
}

const isSamePhone = (current: PhoneNumber | string | undefined, next: PhoneNumber): boolean => {
  const values = toPhoneFormValues(current)
  if (!values) return false
  const currentAsPhone = toPhoneNumber(values.code, values.number)
  return currentAsPhone.code === next.code && currentAsPhone.number === next.number
}

/**
 * The phone the profile save should write, or `undefined` when it is still the number
 * already stored. The field is required on both profiles, so a blank value never reaches
 * this past validation; `PATCH /identity/phone` cannot clear a number either way.
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
export const ChangePhoneForm: FC<Props> = ({ disabled }) => {
  const t = useTranslations('Settings.phone')

  return <PhoneNumberField label={t('label')} disabled={disabled} />
}
