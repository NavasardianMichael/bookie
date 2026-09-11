'use client'

import { useState } from 'react'
import { Alert, Divider, Form } from 'antd'
import type { Rule } from 'antd/es/form'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { usePasswordRules } from '@hooks/usePasswordRules'
import { OrganizationValue } from '@interfaces/auth'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { toOrganizationFields, toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { MailIcon, UserIcon } from '@components/ui/icons'
import { OrganizationAutocomplete } from './OrganizationAutocomplete'
import { FieldLabel } from '../components/FieldLabel'
import { GoogleButton } from '../components/GoogleButton'
import { PasswordField } from '../components/PasswordField'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'

type ProviderRegistrationFormValues = PhoneFormValues & {
  organization?: OrganizationValue
  firstName: string
  lastName: string
  email: string
  password: string
}

const INITIAL_VALUES: ProviderRegistrationFormValues = {
  organization: undefined,
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  code: undefined,
  number: '',
}

const ORGANIZATION_INPUT_ID = 'organization'

/**
 * `required` cannot express this: the field's value is an object, so antd would accept
 * `{ name: '' }` as present. The name itself has to carry text.
 */
const organizationRules = (message: string): Rule[] => [
  {
    validator: (_, value: OrganizationValue | undefined) =>
      value?.name?.trim() ? Promise.resolve() : Promise.reject(new Error(message)),
  },
]

/**
 * Provider registration, per `design/initial prototype/provider_registration`.
 *
 * The prototype's "Business Name" is an Organization combobox here, and first and last name
 * are collected alongside it so a provider is never created with the server's placeholder
 * name.
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const emailRules = useFormItemRules('required', 'email')
  // Mirrors the server policy in full — length, letter+number, and not the email.
  const passwordRules = usePasswordRules('email')

  const handleFinish = async (values: ProviderRegistrationFormValues) => {
    setSubmitError(null)
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
          ...toOrganizationFields(values.organization),
        },
        locale,
      })
      push(ROUTES.verifyEmail)
    } catch (error) {
      setSubmitError(processError(error).message)
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
        {submitError && <Alert type='error' showIcon message={submitError} />}

        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor={ORGANIZATION_INPUT_ID} className='text-brand font-semibold'>
            {t('fields.organization')}
          </FieldLabel>
          <AppFormItem
            name='organization'
            rules={organizationRules(t('validation.organizationRequired'))}
            messageVariables={{ label: t('fields.organization') }}
          >
            <OrganizationAutocomplete id={ORGANIZATION_INPUT_ID} placeholder='Acme Services' disabled={isPending} />
          </AppFormItem>
        </div>

        <RegistrationField
          name='firstName'
          label={t('fields.firstName')}
          placeholder={t('fields.firstNamePlaceholder')}
          autoComplete='given-name'
          rules={nameRules}
          icon={<UserIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
          labelClassName='text-brand font-semibold'
        />

        <RegistrationField
          name='lastName'
          label={t('fields.lastName')}
          placeholder={t('fields.lastNamePlaceholder')}
          autoComplete='family-name'
          rules={nameRules}
          icon={<UserIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
          labelClassName='text-brand font-semibold'
        />

        <RegistrationField
          name='email'
          label={t('fields.professionalEmail')}
          placeholder={t('fields.emailPlaceholder')}
          type='email'
          autoComplete='username'
          rules={emailRules}
          icon={<MailIcon className='text-brand-muted h-4 w-4' />}
          disabled={isPending}
          labelClassName='text-brand font-semibold'
        />

        <PasswordField
          name='password'
          label={t('fields.password')}
          placeholder={t('fields.choosePasswordPlaceholder')}
          autoComplete='new-password'
          disabled={isPending}
          rules={passwordRules}
        />

        <PhoneNumberField
          label={t('fields.phoneMandatory')}
          disabled={isPending}
          labelClassName='text-brand font-semibold'
        />

        <AppButton type='primary' variant='solid' htmlType='submit' className='mt-4 w-full' loading={isPending}>
          {t('providerRegistration.submit')}
        </AppButton>
      </Form>
    </>
  )
}
