'use client'

import { useState } from 'react'
import { Divider, Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { NewOrganizationFormValues, OrganizationValue } from '@interfaces/auth'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { MailIcon, UserIcon } from '@components/ui/icons'
import { GoogleButton } from '../components/GoogleButton'
import { NewPasswordFields } from '../components/NewPasswordFields'
import { OrganizationSection } from '../components/OrganizationSection'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'
import { useSimilarOrganizationCheck } from '../components/useSimilarOrganizationCheck'

type ProviderRegistrationFormValues = PhoneFormValues & {
  organization?: OrganizationValue
  newOrganization?: NewOrganizationFormValues
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

const INITIAL_VALUES: ProviderRegistrationFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  code: undefined,
  number: '',
  password: '',
  confirmPassword: '',
  organization: undefined,
}

/**
 * Provider registration, per `design/initial prototype/provider_registration`.
 *
 * The prototype's "Business Name" is an optional Organization section here, closed behind an
 * "Add organization" button because a sole trader has none: open, it searches existing
 * organizations or registers a new one with its public-page details in the same submit —
 * after asking, when an organization with a similar name already exists.
 * First and last name are collected so a provider is never created with the server's
 * placeholder name, and the phone is required, as it is for consumers.
 *
 * **Submitting does not sign you in.** `POST /identity/register` creates the account and
 * mails a verification link; an unverified account cannot hold a session, so the funnel
 * continues from the recipient's inbox. The success screen says exactly that.
 */
export const ProviderRegistrationForm: React.FC = () => {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const { push } = useRouter()
  const [form] = Form.useForm<ProviderRegistrationFormValues>()
  const register = useAuthStore.use.register()
  const isPending = useAuthStore.use.isPending()
  const [submitError, setSubmitError] = useState<unknown>(null)

  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const emailRules = useFormItemRules('required', 'email')
  const { resolveOrganization, isChecking, dialog } = useSimilarOrganizationCheck((organization) =>
    form.setFieldValue('organization', { id: organization.id, name: organization.basic.name })
  )

  const handleFinish = async (values: ProviderRegistrationFormValues) => {
    setSubmitError(null)
    const organization = await resolveOrganization(values.organization, values.newOrganization)
    if (!organization) return

    try {
      await register({
        role: USER_TYPES.provider,
        email: values.email,
        password: values.password,
        phone: toPhoneNumber(values.code!, values.number),
        profile: {
          firstName: values.firstName,
          lastName: values.lastName,
          country: values.code,
          ...organization,
        },
        locale,
      })
      push(ROUTES.verifyEmail)
    } catch (error) {
      setSubmitError(error)
    }
  }

  return (
    <>
      <GoogleButton role={USER_TYPES.provider} disabled={isPending} />

      {/* Inline, not `my-0!`: a `!` suffix cannot beat antd's unlayered cssinjs, and the
            column already owns its spacing through the parent flex `gap`. */}
        <Divider plain style={{ margin: 0 }}>
        <span className='text-caption text-brand-muted'>{t('orWithEmail')}</span>
      </Divider>

      <Form
        form={form}
        name='providerRegistration'
        layout='vertical'
        requiredMark={false}
        initialValues={INITIAL_VALUES}
        onFinish={handleFinish}
        onValuesChange={() => setSubmitError(null)}
        scrollToFirstError
        className='flex w-full flex-col gap-4'
      >
        {submitError !== null && <ErrorAlert error={submitError} />}

        <RegistrationField
          name='firstName'
          label={t('fields.firstName')}
          requirement='Required'
          placeholder={t('fields.firstName')}
          autoComplete='given-name'
          rules={nameRules}
          icon={<UserIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
          labelClassName='text-brand font-semibold'
        />

        <RegistrationField
          name='lastName'
          label={t('fields.lastName')}
          requirement='Required'
          placeholder={t('fields.lastName')}
          autoComplete='family-name'
          rules={nameRules}
          icon={<UserIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
          labelClassName='text-brand font-semibold'
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
          labelClassName='text-brand font-semibold'
        />

        <PhoneNumberField
          label={t('fields.phone')}
          requirement='Required'
          disabled={isPending}
          labelClassName='text-brand font-semibold'
        />

        <NewPasswordFields
          emailFieldName='email'
          placeholder={t('fields.choosePasswordPlaceholder')}
          requirement='Required'
          disabled={isPending}
        />

        <OrganizationSection disabled={isPending} labelClassName='text-brand font-semibold' />

        <AppButton type='primary' variant='solid' htmlType='submit' className='mt-4 w-full' loading={isPending || isChecking}>
          {t('providerRegistration.submit')}
        </AppButton>

        {dialog}
      </Form>
    </>
  )
}
