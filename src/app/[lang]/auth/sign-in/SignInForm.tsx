'use client'

import { FC, useMemo, useState } from 'react'
import { Divider, Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { resendVerificationAPI } from '@api/auth/main'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useRouter } from '@i18n/navigation'
import { AUTH_ERROR_CODES, GOOGLE_ERROR_CODES, GoogleErrorCode } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { MailIcon } from '@components/ui/icons'
import { GoogleButton } from '../components/GoogleButton'
import { PasswordField } from '../components/PasswordField'
import { RegistrationField } from '../components/RegistrationField'

type SignInFormValues = {
  email: string
  password: string
}

const isGoogleErrorCode = (value?: string): value is GoogleErrorCode =>
  !!value && (GOOGLE_ERROR_CODES as readonly string[]).includes(value)

type Props = {
  /**
   * The `?error=` the API's Google callback redirected back with. Read by the page — a
   * Server Component — rather than with a client hook, because `next/navigation` is a
   * grep gate and `@i18n/navigation` exposes no `useSearchParams`.
   */
  googleErrorCode?: string
}

/**
 * Sign-in: email and password, or Google.
 *
 * Errors show **inline** rather than as a toast, because two of them are actionable — an
 * unverified account offers to resend its link, and every Google failure arrives as an
 * `?error=` code on the URL rather than as a rejected request, so there is no throw to
 * catch and nothing to attach a toast to.
 */
export const SignInForm: FC<Props> = ({ googleErrorCode }) => {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const { push } = useRouter()
  const [form] = Form.useForm<SignInFormValues>()

  const login = useAuthStore.use.login()
  const isPending = useAuthStore.use.isPending()

  const [error, setError] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resent, setResent] = useState(false)

  const emailRules = useFormItemRules('required', 'email')
  const passwordRules = useFormItemRules('required')

  /**
   * The API's Google callback cannot answer with JSON — it is a browser navigation — so it
   * reports failures as a stable code here. Unknown values fall back to the generic
   * message rather than rendering a raw code at the user.
   */
  const googleError = useMemo(() => {
    if (!googleErrorCode) return null
    return isGoogleErrorCode(googleErrorCode) ? t(`googleErrors.${googleErrorCode}`) : t('googleErrors.generic')
  }, [googleErrorCode, t])

  const handleFinish = async (values: SignInFormValues) => {
    setError(null)
    setUnverifiedEmail(null)
    setResent(false)
    try {
      const session = await login(values)
      push(session.role === 'provider' ? ROUTES.providerProfile : ROUTES.home)
    } catch (err) {
      const appError = processError(err)
      // Code, not message: the client has to render a *button* for this one branch, and
      // string-matching an error message is not a contract.
      if (appError.code === AUTH_ERROR_CODES.emailUnverified) setUnverifiedEmail(values.email)
      setError(appError.message)
    }
  }

  const handleResend = async () => {
    if (!unverifiedEmail) return
    setIsResending(true)
    try {
      await resendVerificationAPI({ email: unverifiedEmail, locale })
      setResent(true)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setIsResending(false)
    }
  }

  const displayError = error ?? googleError

  return (
    <>
      <div className='flex flex-col gap-1 text-center'>
        <AppTitle level='h1' size='h2'>
          {t('signIn.title')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('signIn.subtitle')}
        </AppParagraph>
      </div>

      <GoogleButton disabled={isPending} />

      {/* Inline, not `my-0!`: a `!` suffix cannot beat antd's unlayered cssinjs, and the
            column already owns its spacing through the parent flex `gap`. */}
        <Divider plain style={{ margin: 0 }}>
        <span className='text-caption text-brand-muted'>{t('orWithEmail')}</span>
      </Divider>

      <Form
        form={form}
        layout='vertical'
        requiredMark={false}
        onFinish={handleFinish}
        onValuesChange={() => setError(null)}
        scrollToFirstError
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
          disabled={isPending}
        />

        <PasswordField
          name='password'
          label={t('fields.password')}
          placeholder={t('fields.passwordPlaceholder')}
          rules={passwordRules}
          autoComplete='current-password'
          disabled={isPending}
        />

        {displayError && (
          <div role='alert' className='rounded-brand-sm bg-red-50 p-3'>
            <AppParagraph size='body-sm' className='m-0 text-red-700'>
              {displayError}
            </AppParagraph>
            {unverifiedEmail && !resent && (
              <AppButton
                type='link'
                size='small'
                loading={isResending}
                onClick={handleResend}
              >
                {t('signIn.resendVerification')}
              </AppButton>
            )}
            {resent && (
              <AppParagraph size='caption' className='m-0 mt-1 text-red-700'>
                {t('signIn.verificationResent')}
              </AppParagraph>
            )}
          </div>
        )}

        <div className='text-end'>
          <AppLink href={ROUTES.forgotPassword} className='text-body-sm font-semibold'>
            {t('signIn.forgotPassword')}
          </AppLink>
        </div>

        <AppButton htmlType='submit' type='primary' size='large' block loading={isPending}>
          {t('signIn.submit')}
        </AppButton>
      </Form>

      <AppParagraph size='body-sm' className='m-0 text-center'>
        {t('signIn.noAccount')}{' '}
        <AppLink href={ROUTES.accountTypeSelection} className='font-semibold'>
          {t('signIn.createAccount')}
        </AppLink>
      </AppParagraph>
    </>
  )
}
