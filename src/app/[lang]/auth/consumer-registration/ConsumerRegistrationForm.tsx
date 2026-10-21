'use client'

import { useState } from 'react'
import { Alert, Divider, Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useFormUnsavedGuard } from '@hooks/useUnsavedChangesGuard'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { toPhoneNumber } from '@helpers/registration'
import { newAccountLandingPath } from '@helpers/workspace'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { ErrorState } from '@components/ui/ErrorState'
import { MailIcon, UserIcon } from '@components/ui/icons'
import { GoogleButton } from '../components/GoogleButton'
import { NewPasswordFields } from '../components/NewPasswordFields'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'
import { TermsNotice } from '../components/TermsNotice'
import { GoogleSignUpWaiting, useGoogleSignUp } from '../components/useGoogleSignUp'

type ConsumerRegistrationFormValues = PhoneFormValues & {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

const INITIAL_VALUES: ConsumerRegistrationFormValues = {
  fullName: '',
  email: '',
  code: undefined,
  number: '',
  password: '',
  confirmPassword: '',
}

/**
 * Consumer registration, per `design/initial prototype/consumer_registration`.
 *
 * **Email is now required and is the identity**, where the prototype had it optional
 * alongside a phone — the account is keyed on it and the verification link is the only way
 * into the account. Phone stays mandatory but is unverified profile data a provider needs
 * in order to reach a client.
 *
 * Submitting does **not** sign anyone in: registration mails a link, and an unverified
 * account cannot hold a session.
 *
 * **Google mode** (`viaGoogle`, from `?google=1`) is the same form for a first-time Google
 * account: name and email prefilled from what Google supplied, the email locked — it is
 * what Google verified — and no password. Submitting finishes the account through
 * `/identity/google/complete`, which signs it in, so it lands where a new consumer starts.
 */
type Props = {
  viaGoogle?: boolean
}

export const ConsumerRegistrationForm: React.FC<Props> = ({ viaGoogle = false }) => {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const { push, replace } = useRouter()
  const [form] = Form.useForm<ConsumerRegistrationFormValues>()
  const unsaved = useFormUnsavedGuard()
  const register = useAuthStore.use.register()
  const completeGoogle = useAuthStore.use.completeGoogle()
  const isPending = useAuthStore.use.isPending()
  const [submitError, setSubmitError] = useState<unknown>(null)
  const google = useGoogleSignUp(viaGoogle)
  const pending = google.status === 'ready' ? google.pending : null

  const nameRules = useFormItemRules('required', 'maxCharsForName')
  const emailRules = useFormItemRules('required', 'email')

  const handleFinish = async (values: ConsumerRegistrationFormValues) => {
    setSubmitError(null)
    const phone = toPhoneNumber(values.code!, values.number)
    const profile = { fullName: values.fullName, country: values.code }

    if (pending) {
      try {
        const session = await completeGoogle({ role: USER_TYPES.consumer, phone, profile })
        // `replace`: the identity this form finished is spent, so back has nothing to return to.
        unsaved.release()
        replace(newAccountLandingPath(session.role))
      } catch (error) {
        setSubmitError(error)
      }
      return
    }

    try {
      await register({
        role: USER_TYPES.consumer,
        email: values.email,
        password: values.password,
        phone,
        profile,
        locale,
      })
      unsaved.release()
      push(ROUTES.verifyEmail)
    } catch (error) {
      // Staying put matters: navigating on a failed request would strand the user on a
      // "check your inbox" screen waiting for mail that was never sent.
      setSubmitError(error)
    }
  }

  if (google.status === 'loading') return <GoogleSignUpWaiting />
  if (google.status === 'failed') return <ErrorState error={google.error} onRetry={google.retry} />

  return (
    <div className='flex w-full flex-col gap-6'>
      {google.status === 'expired' && <Alert type='info' showIcon title={t('googleSignUp.expired')} />}

      {!pending && (
        <>
          <GoogleButton role={USER_TYPES.consumer} disabled={isPending} />

          {/* Inline, not `my-0!`: a `!` suffix cannot beat antd's unlayered cssinjs, so the
              column's `gap` is what spaces this divider from the button and the fields. */}
          <Divider plain style={{ margin: 0 }}>
            <span className='text-caption text-brand-muted'>{t('orWithEmail')}</span>
          </Divider>
        </>
      )}

      <Form
        form={form}
        name='consumerRegistration'
        layout='vertical'
        requiredMark={false}
        initialValues={
          pending ? { ...INITIAL_VALUES, fullName: pending.fullName, email: pending.email } : INITIAL_VALUES
        }
        onFinish={handleFinish}
        onValuesChange={() => {
          unsaved.mark()
          setSubmitError(null)
        }}
        scrollToFirstError
        className='flex w-full flex-col gap-5'
      >
        {submitError !== null && <ErrorAlert error={submitError} />}

        <RegistrationField
          name='fullName'
          label={t('fields.fullName')}
          requirement='Required'
          placeholder={t('fields.fullName')}
          autoComplete='name'
          rules={nameRules}
          icon={<UserIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
        />

        {/* Its own column, so the Google caption sits under the field rather than a form gap away. */}
        <div className='flex flex-col gap-1.5'>
          <RegistrationField
            name='email'
            label={t('fields.email')}
            requirement='Required'
            placeholder={t('fields.emailPlaceholder')}
            type='email'
            autoComplete='username'
            rules={emailRules}
            icon={<MailIcon className='text-brand-muted h-4 w-4' />}
            disabled={isPending || Boolean(pending)}
          />
          {pending && (
            <AppText size='caption' tone='muted'>
              {t('googleSignUp.emailFromGoogle')}
            </AppText>
          )}
        </div>

        <PhoneNumberField label={t('fields.phone')} requirement='Required' disabled={isPending} />

        {!pending && (
          <NewPasswordFields
            emailFieldName='email'
            placeholder={t('fields.choosePasswordPlaceholder')}
            requirement='Required'
            disabled={isPending}
          />
        )}

        <AppButton type='primary' variant='solid' htmlType='submit' className='w-full' loading={isPending}>
          {t('consumerRegistration.submit')}
        </AppButton>

        <TermsNotice lead={t('termsLead')} />
      </Form>
    </div>
  )
}
