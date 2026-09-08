'use client'

import { FC, useEffect, useState } from 'react'
import { PhoneFormValues, PhoneNumberField } from '@app/[lang]/auth/components/PhoneNumberField'
import { Alert, Form, Input } from 'antd'
import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { changePhoneConfirmAPI, changePhoneSendOtpAPI } from '@api/auth/main'
import { PhoneNumber } from '@interfaces/app'
import { processError } from '@helpers/error'
import { toPhoneFormValues, toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'
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
 * In-account phone change via OTP. Does not route through `/auth/code-input`.
 *
 * When `embedded`, this must not render a `<form>` — it already sits inside the
 * profile Form, and a nested form tag (or a submit button) would steal the parent.
 */
export const ChangePhoneForm: FC<Props> = ({ currentPhone, onChanged, embedded = false }) => {
  const t = useTranslations('Settings.phone')
  const [form] = Form.useForm<PhoneFormValues>()
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const typedCode = Form.useWatch('code', form)
  const typedNumber = Form.useWatch('number', form)
  const typedPhone =
    typedCode && typedNumber?.trim() ? toPhoneNumber(typedCode, typedNumber.trim()) : undefined
  const canSend = Boolean(
    typedPhone && isValidTypedPhone(typedCode, typedNumber) && !isSamePhone(currentPhone, typedPhone)
  )

  useEffect(() => {
    const values = toPhoneFormValues(currentPhone)
    if (!values) return
    form.setFieldsValue(values)
  }, [currentPhone, form])

  const handleSend = async () => {
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
      const phone = toPhoneNumber(values.code!, values.number)
      await changePhoneSendOtpAPI({ phone })
      setOtpSent(true)
      setSuccess(t('codeSent'))
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setPending(false)
    }
  }

  const handleConfirm = async () => {
    setError(null)
    setSuccess(null)
    setPending(true)
    try {
      const result = await changePhoneConfirmAPI({ otp })
      setSuccess(t('updated'))
      setOtpSent(false)
      setOtp('')
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
        {!otpSent ? (
          <AppButton
            type='default'
            htmlType='button'
            onClick={() => void handleSend()}
            loading={pending}
            disabled={!canSend}
            className='self-start'
          >
            {t('sendCode')}
          </AppButton>
        ) : (
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
            <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
              <AppText size='body-sm' className='font-bold'>
                {t('otp')}
              </AppText>
              <Input.OTP length={6} value={otp} onChange={setOtp} disabled={pending} />
            </div>
            <AppButton type='primary' onClick={handleConfirm} loading={pending} disabled={otp.length < 6}>
              {t('confirm')}
            </AppButton>
          </div>
        )}
      </Form>
    </>
  )

  if (embedded) {
    return <div className='flex flex-col gap-3'>{body}</div>
  }

  return <Surface className='flex flex-col gap-3'>{body}</Surface>
}
