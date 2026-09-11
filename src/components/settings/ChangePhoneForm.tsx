'use client'

import { FC, useEffect, useState } from 'react'
import { PhoneFormValues, PhoneNumberField } from '@app/[lang]/auth/components/PhoneNumberField'
import { Alert, Form } from 'antd'
import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { changePhoneAPI } from '@api/auth/main'
import { PhoneNumber } from '@interfaces/app'
import { processError } from '@helpers/error'
import { toPhoneFormValues, toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  currentPhone?: PhoneNumber | string
  onChanged?: (phone: PhoneNumber) => void
  /** Skip the outer Surface when the form already sits inside Personal Information. */
  embedded?: boolean
}

const isValidTypedPhone = (code: CountryCode | undefined, number: string | undefined): boolean => {
  if (!code || !number?.trim()) return false
  try {
    return isValidPhoneNumber(`+${getCountryCallingCode(code)}${number}`)
  } catch {
    return false
  }
}

const isSamePhone = (current: PhoneNumber | string | undefined, next: PhoneNumber): boolean => {
  const values = toPhoneFormValues(current)
  if (!values) return false
  const currentAsPhone = toPhoneNumber(values.code, values.number)
  return currentAsPhone.code === next.code && currentAsPhone.number === next.number
}

/**
 * In-account phone change — one field and a save.
 *
 * **No OTP, and nothing to confirm.** Phone stopped being identity in the email/password
 * migration: it is now unverified contact data on the profile, with no unique constraint,
 * so `PATCH /identity/phone` writes it directly. The send-code/enter-code pair this used to
 * run verified nothing that mattered and only stood between the user and a corrected number.
 *
 * When `embedded`, this must not render a `<form>` — it already sits inside the profile
 * Form, and a nested form tag (or a submit button) would steal the parent.
 */
export const ChangePhoneForm: FC<Props> = ({ currentPhone, onChanged, embedded = false }) => {
  const t = useTranslations('Settings.phone')
  const tActions = useTranslations('Settings.actions')
  const [form] = Form.useForm<PhoneFormValues>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const typedCode = Form.useWatch('code', form)
  const typedNumber = Form.useWatch('number', form)
  const typedPhone = typedCode && typedNumber?.trim() ? toPhoneNumber(typedCode, typedNumber.trim()) : undefined
  const canSave = Boolean(
    typedPhone && isValidTypedPhone(typedCode, typedNumber) && !isSamePhone(currentPhone, typedPhone)
  )

  useEffect(() => {
    const values = toPhoneFormValues(currentPhone)
    if (!values) return
    form.setFieldsValue(values)
  }, [currentPhone, form])

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    let values: PhoneFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    setPending(true)
    try {
      const result = await changePhoneAPI({ phone: toPhoneNumber(values.code!, values.number) })
      setSuccess(t('updated'))
      const next = toPhoneFormValues(result.phone)
      if (next) form.setFieldsValue(next)
      onChanged?.(result.phone)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setPending(false)
    }
  }

  const body = (
    <>
      {error && <Alert type='error' showIcon message={error} />}
      {success && <Alert type='success' showIcon message={success} />}

      <Form
        form={form}
        layout='vertical'
        component={embedded ? false : undefined}
        initialValues={toPhoneFormValues(currentPhone)}
        className='flex flex-col gap-3'
        requiredMark={false}
      >
        <PhoneNumberField label={t('label')} />
        <AppButton
          type='default'
          htmlType='button'
          onClick={() => void handleSave()}
          loading={pending}
          disabled={!canSave}
          className='self-start'
        >
          {tActions('save')}
        </AppButton>
      </Form>
    </>
  )

  if (embedded) {
    return <div className='flex flex-col gap-3'>{body}</div>
  }

  return <Surface className='flex flex-col gap-3'>{body}</Surface>
}
