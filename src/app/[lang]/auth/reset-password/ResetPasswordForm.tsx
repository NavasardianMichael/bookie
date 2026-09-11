'use client'

import { FC, useState } from 'react'
import { Form } from 'antd'
import { useTranslations } from 'next-intl'
import { resetPasswordAPI } from '@api/auth/main'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { usePasswordRules } from '@hooks/usePasswordRules'
import { useRouter } from '@i18n/navigation'
import { PASSWORD_MIN_LENGTH } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CheckCircleIcon } from '@components/ui/icons'
import { PasswordField } from '../components/PasswordField'

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
  const [error, setError] = useState<string | null>(null)

  const requiredRules = useFormItemRules('required')
  const passwordRules = usePasswordRules()

  const handleFinish = async (values: ResetPasswordFormValues) => {
    if (!token) return
    setIsSubmitting(true)
    setError(null)
    try {
      await resetPasswordAPI({ token, password: values.password })
      setDone(true)
    } catch (err) {
      setError(processError(err).message)
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
        <AppButton type='primary' size='large' className='mt-2' onClick={() => push(ROUTES.signIn)}>
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
        <PasswordField
          name='password'
          label={t('fields.newPassword')}
          rules={passwordRules}
          autoComplete='new-password'
          disabled={isSubmitting}
        />

        <PasswordField
          name='confirmPassword'
          label={t('fields.confirmPassword')}
          autoComplete='new-password'
          disabled={isSubmitting}
          // `dependencies` is what re-runs this rule when `password` changes — without it
          // a match validated once stays "valid" after the first field is edited.
          dependencies={['password']}
          rules={[
            ...requiredRules,
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('validation.passwordsDoNotMatch'))),
            }),
          ]}
        />

        {error && (
          <div role='alert' className='rounded-brand-sm bg-red-50 p-3'>
            <AppParagraph size='body-sm' className='m-0 text-red-700'>
              {error}
            </AppParagraph>
          </div>
        )}

        <AppButton htmlType='submit' type='primary' size='large' block loading={isSubmitting}>
          {t('resetPassword.submit')}
        </AppButton>
      </Form>
    </>
  )
}
