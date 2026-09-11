'use client'

import { useState } from 'react'
import { Alert, Divider, Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { usePasswordRules } from '@hooks/usePasswordRules'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { MailIcon, UserIcon } from '@components/ui/icons'
import { GoogleButton } from '../components/GoogleButton'
import { PasswordField } from '../components/PasswordField'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'
import { TermsNotice } from '../components/TermsNotice'

type ConsumerRegistrationFormValues = PhoneFormValues & {
  firstName: string
  lastName: string
  email: string
  password: string
}

const INITIAL_VALUES: ConsumerRegistrationFormValues = {
  firstName: '',
  lastName: '',
  code: undefined,
  number: '',
  email: '',
  password: '',
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
 */
export const ConsumerRegistrationForm: React.FC = () => {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const { push } = useRouter()
  const [form] = Form.useForm<ConsumerRegistrationFormValues>()
  const register = useAuthStore.use.register()
  const isPending = useAuthStore.use.isPending()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const emailRules = useFormItemRules('required', 'email')
  // Mirrors the server policy in full — length, letter+number, and not the email.
  const passwordRules = usePasswordRules('email')

  const handleFinish = async (values: ConsumerRegistrationFormValues) => {
    setSubmitError(null)
    try {
      await register({
        role: USER_TYPES.consumer,
        email: values.email,
        password: values.password,
        phone: toPhoneNumber(values.code!, values.number),
        profile: {
          firstName: values.firstName,
          lastName: values.lastName,
          country: values.code,
        },
        locale,
      })
      push(ROUTES.verifyEmail)
    } catch (error) {
      // Staying put matters: navigating on a failed request would strand the user on a
      // "check your inbox" screen waiting for mail that was never sent.
      setSubmitError(processError(error).message)
    }
  }

  return (
    <>
      <GoogleButton role={USER_TYPES.consumer} disabled={isPending} />

      {/* Inline, not `my-0!`: a `!` suffix cannot beat antd's unlayered cssinjs, and the
            column already owns its spacing through the parent flex `gap`. */}
        <Divider plain style={{ margin: 0 }}>
        <span className='text-caption text-brand-muted'>{t('orWithEmail')}</span>
      </Divider>

      <Form
        form={form}
        name='consumerRegistration'
        layout='vertical'
        requiredMark={false}
        initialValues={INITIAL_VALUES}
        onFinish={handleFinish}
        onValuesChange={() => setSubmitError(null)}
        scrollToFirstError
        className='flex w-full flex-col gap-5'
      >
        {submitError && <Alert type='error' showIcon message={submitError} />}

        <RegistrationField
          name='firstName'
          label={t('fields.firstName')}
          requirement='Required'
          placeholder={t('fields.firstNamePlaceholder')}
          autoComplete='given-name'
          rules={nameRules}
          icon={<UserIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
        />

        <RegistrationField
          name='lastName'
          label={t('fields.lastName')}
          requirement='Required'
          placeholder={t('fields.lastNamePlaceholder')}
          autoComplete='family-name'
          rules={nameRules}
          icon={<UserIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
        />

        <RegistrationField
          name='email'
          label={t('fields.email')}
          requirement='Required'
          placeholder={t('fields.emailPlaceholder')}
          type='email'
          autoComplete='username'
          rules={emailRules}
          icon={<MailIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
        />

        <PasswordField
          name='password'
          label={t('fields.password')}
          placeholder={t('fields.choosePasswordPlaceholder')}
          requirement='Required'
          autoComplete='new-password'
          disabled={isPending}
          rules={passwordRules}
        />

        <PhoneNumberField label={t('fields.mobileNumber')} requirement='Required' disabled={isPending} />

        <AppButton type='primary' variant='solid' htmlType='submit' className='w-full' loading={isPending}>
          {t('consumerRegistration.submit')}
        </AppButton>

        <TermsNotice lead={t('termsLead')} />
      </Form>
    </>
  )
}
