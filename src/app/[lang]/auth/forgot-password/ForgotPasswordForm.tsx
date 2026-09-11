'use client'

import { FC, useState } from 'react'
import { Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { forgotPasswordAPI } from '@api/auth/main'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CheckCircleIcon, MailIcon } from '@components/ui/icons'
import { RegistrationField } from '../components/RegistrationField'

type ForgotPasswordFormValues = {
  email: string
}

/**
 * Asks for the address and sends a reset link.
 *
 * The success state is deliberately **unconditional and vague** — "if an account exists" —
 * because the API answers identically whether or not the address is registered. Saying
 * "we've sent it" for one and "no such account" for the other would rebuild exactly the
 * enumeration oracle the route was written to avoid.
 */
export const ForgotPasswordForm: FC = () => {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const [form] = Form.useForm<ForgotPasswordFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailRules = useFormItemRules('required', 'email')

  const handleFinish = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await forgotPasswordAPI({ email: values.email, locale })
      setSubmitted(true)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='text-brand flex size-14 items-center justify-center rounded-full bg-brand-50'>
          <CheckCircleIcon className='h-7 w-7' />
        </span>
        <AppTitle level='h1' size='h2'>
          {t('forgotPassword.sentTitle')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('forgotPassword.sentBody')}
        </AppParagraph>
        <AppLink href={ROUTES.signIn} variant='button' className='mt-2'>
          {t('backToSignIn')}
        </AppLink>
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-1 text-center'>
        <AppTitle level='h1' size='h2'>
          {t('forgotPassword.title')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('forgotPassword.subtitle')}
        </AppParagraph>
      </div>

      <Form
        form={form}
        layout='vertical'
        requiredMark={false}
        onFinish={handleFinish}
        onValuesChange={() => setError(null)}
        className='flex w-full flex-col gap-4'
      >
        <RegistrationField
          name='email'
          type='email'
          label={t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          icon={<MailIcon className='text-brand-muted h-4 w-4' />}
          rules={emailRules}
          autoComplete='username'
          disabled={isSubmitting}
        />

        {error && (
          <div role='alert' className='rounded-brand-sm bg-red-50 p-3'>
            <AppParagraph size='body-sm' className='m-0 text-red-700'>
              {error}
            </AppParagraph>
          </div>
        )}

        <AppButton htmlType='submit' type='primary' size='large' block loading={isSubmitting}>
          {t('forgotPassword.submit')}
        </AppButton>
      </Form>

      <AppParagraph size='body-sm' className='m-0 text-center'>
        <AppLink href={ROUTES.signIn} className='font-semibold'>
          {t('backToSignIn')}
        </AppLink>
      </AppParagraph>
    </>
  )
}
