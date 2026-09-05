'use client'

import { FC, useState } from 'react'
import { PhoneFormValues, PhoneNumberField } from '@app/[lang]/auth/components/PhoneNumberField'
import { Alert, Form, Input } from 'antd'
import { useTranslations } from 'next-intl'
import { changePhoneConfirmAPI, changePhoneSendOtpAPI } from '@api/auth/main'
import { PhoneNumber } from '@interfaces/app'
import { processError } from '@helpers/error'
import { toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  currentPhone?: PhoneNumber | string
  onChanged?: (phone: PhoneNumber) => void
}

/**
 * In-tab phone change via OTP. Does not route through `/auth/code-input`.
 */
export const ChangePhoneForm: FC<Props> = ({ currentPhone, onChanged }) => {
  const t = useTranslations('Settings.phone')
  const [form] = Form.useForm<PhoneFormValues>()
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const displayCurrent =
    typeof currentPhone === 'string'
      ? currentPhone
      : currentPhone
        ? `+${currentPhone.code}${currentPhone.number}`
        : '—'

  const handleSend = async (values: PhoneFormValues) => {
    setError(null)
    setSuccess(null)
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
      form.resetFields()
      onChanged?.(result.phone)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Surface className='flex flex-col gap-6'>
      <div>
        <AppText size='body-sm' tone='muted' className='font-bold'>
          {t('current')}
        </AppText>
        <AppParagraph className='mt-1 font-semibold' tone='default'>
          {displayCurrent}
        </AppParagraph>
      </div>

      {error && <Alert type='error' showIcon message={error} />}
      {success && <Alert type='success' showIcon message={success} />}

      <Form form={form} layout='vertical' onFinish={handleSend} className='flex flex-col gap-4' requiredMark={false}>
        <PhoneNumberField label={t('newPhone')} requirement='Required' />
        {!otpSent ? (
          <AppButton type='primary' htmlType='submit' loading={pending} className='self-start'>
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
    </Surface>
  )
}
