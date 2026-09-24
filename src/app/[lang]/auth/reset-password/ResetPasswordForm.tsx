'use client'

import { FC, useState } from 'react'
import { Form } from 'antd'
import { useTranslations } from 'next-intl'
import { resetPasswordAPI } from '@api/auth/main'
import { useRouter } from '@i18n/navigation'
import { PASSWORD_MIN_LENGTH } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { CheckCircleIcon } from '@components/ui/icons'
import { NewPasswordFields } from '../components/NewPasswordFields'

type ResetPasswordFormValues = {
  password: string
  confirmPassword: string
}

type Props = {
  /** The one-time token from the emailed link. Absent means the link was malformed. */
  token?: string
}

export const ResetPasswordForm: FC<Props> = ({ token }) => {
  const t = useTranslations('Auth')
  const { push } = useRouter()
  const [form] = Form.useForm<ResetPasswordFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const handleFinish = async (values: ResetPasswordFormValues) => {
    if (!token) return
    setIsSubmitting(true)
    setError(null)
    try {
      await resetPasswordAPI({ token, password: values.password })
      setDone(true)
    } catch (err) {
      setError(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className='flex flex-col items-center gap-3 text-center'>
        <AppTitle level='h1' size='h2'>
          {t('resetPassword.invalidTitle')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('resetPassword.invalidBody')}
        </AppParagraph>
        <AppLink href={ROUTES.forgotPassword} variant='button' className='mt-2'>
          {t('resetPassword.requestNew')}
        </AppLink>
      </div>
    )
  }

  if (done) {
    return (
      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='text-brand flex size-14 items-center justify-center rounded-full bg-brand-50'>
          <CheckCircleIcon className='h-7 w-7' />
        </span>
        <AppTitle level='h1' size='h2'>
          {t('resetPassword.doneTitle')}
        </AppTitle>
        {/* Every existing session was revoked by the reset (`tokenVersion` bumped), so
            signing in again is required rather than optional. */}
        <AppParagraph size='body-sm' className='m-0'>
          {t('resetPassword.doneBody')}
        </AppParagraph>
        <AppButton type='primary' className='mt-2' onClick={() => push(ROUTES.signIn)}>
          {t('backToSignIn')}
        </AppButton>
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-1 text-center'>
        <AppTitle level='h1' size='h2'>
          {t('resetPassword.title')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('resetPassword.subtitle', { min: PASSWORD_MIN_LENGTH })}
        </AppParagraph>
      </div>

      <Form
        form={form}
        layout='vertical'
        requiredMark={false}
        onFinish={handleFinish}
        onValuesChange={() => setError(null)}
        scrollToFirstError
        className='flex w-full flex-col gap-4'
      >
        <NewPasswordFields passwordLabel={t('fields.newPassword')} disabled={isSubmitting} />

        {error !== null && <ErrorAlert error={error} />}

        <AppButton htmlType='submit' type='primary' block loading={isSubmitting}>
          {t('resetPassword.submit')}
        </AppButton>
      </Form>
    </>
  )
}
