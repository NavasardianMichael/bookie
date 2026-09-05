'use client'

import { FC, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Form, Input } from 'antd'
import { useTranslations } from 'next-intl'
import { changeEmailConfirmAPI, changeEmailSendOtpAPI } from '@api/auth/main'
import { FORM_ITEM_RULES } from '@constants/form'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppText } from '@components/ui/bare/AppText'
import { MailIcon } from '@components/ui/icons'

type Props = {
  currentEmail?: string
  emailVerifiedAt?: string
  onVerified?: (email: string) => void
  /** When true, email is a named Form.Item still owned by the parent form. */
  name?: string
  disabled?: boolean
}

/**
 * Email field with "Send code" / OTP verify for a *new* address. Parent form still
 * owns the email value; verification applies via identity endpoints.
 */
export const EmailVerifyField: FC<Props> = ({
  currentEmail,
  emailVerifiedAt,
  onVerified,
  name = 'email',
  disabled,
}) => {
  const t = useTranslations('Settings.profile')
  const form = Form.useFormInstance()
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSend = async () => {
    setError(null)
    setSuccess(null)
    const email = String(form.getFieldValue(name) ?? '').trim()
    if (!email) {
      setError(t('emailRequired'))
      return
    }
    setPending(true)
    try {
      await changeEmailSendOtpAPI({ email })
      setOtpSent(true)
      setSuccess(t('emailCodeSent'))
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
      const result = await changeEmailConfirmAPI({ otp })
      setSuccess(t('emailVerified'))
      setOtpSent(false)
      setOtp('')
      form.setFieldValue(name, result.email)
      onVerified?.(result.email)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor={name} requirement='Optional'>
          {t('email')}
        </FieldLabel>
        <AppFormItem name={name} rules={[FORM_ITEM_RULES.email]} messageVariables={{ label: t('email') }}>
          <AppInput
            id={name}
            type='email'
            autoComplete='email'
            disabled={disabled}
            prefix={<MailIcon className='text-brand-muted h-4 w-4' />}
          />
        </AppFormItem>
        {emailVerifiedAt && currentEmail && (
          <AppText size='caption' tone='muted'>
            {t('verifiedAt', { date: new Date(emailVerifiedAt).toLocaleDateString() })}
          </AppText>
        )}
      </div>

      {error && <Alert type='error' showIcon message={error} />}
      {success && <Alert type='success' showIcon message={success} />}

      {!otpSent ? (
        <AppButton type='default' onClick={handleSend} loading={pending} className='self-start'>
          {t('sendEmailCode')}
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
            {t('confirmEmail')}
          </AppButton>
        </div>
      )}
    </div>
  )
}
