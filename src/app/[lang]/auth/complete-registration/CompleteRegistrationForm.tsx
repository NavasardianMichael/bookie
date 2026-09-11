'use client'

import { FC, useEffect, useState } from 'react'
import { Form, Segmented, Spin } from 'antd'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { getGooglePendingAPI } from '@api/auth/main'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { OrganizationValue, PendingGoogleAccount, UserType } from '@interfaces/auth'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { toOrganizationFields, toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { UserIcon } from '@components/ui/icons'
import { FieldLabel } from '../components/FieldLabel'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'
import { OrganizationAutocomplete } from '../provider-registration/OrganizationAutocomplete'

type CompleteRegistrationFormValues = PhoneFormValues & {
  role: UserType
  firstName: string
  lastName: string
  organization?: OrganizationValue
}

/** Same reasoning as the provider registration form: the value is an object, so `required` cannot see an empty name. */
const organizationRules = (message: string): Rule[] => [
  {
    validator: (_, value: OrganizationValue | undefined) =>
      value?.name?.trim() ? Promise.resolve() : Promise.reject(new Error(message)),
  },
]

/**
 * The last step of a first-time Google sign-up.
 *
 * Google supplies a verified email and a display name, and nothing else this app needs: both
 * profile tables require a phone, and only the visitor knows whether they are booking or
 * being booked. Those are collected here and posted to `/identity/google/complete`, which
 * is the first moment anything is written — an abandoned flow leaves no row.
 *
 * The email is shown but **not editable**: it is the thing Google verified, and letting it
 * be changed would turn this into a way to register any address without proving control.
 */
export const CompleteRegistrationForm: FC = () => {
  const t = useTranslations('Auth')
  const { push, replace } = useRouter()
  const [form] = Form.useForm<CompleteRegistrationFormValues>()

  const completeGoogle = useAuthStore.use.completeGoogle()
  const isPending = useAuthStore.use.isPending()

  const [pending, setPending] = useState<PendingGoogleAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const role = Form.useWatch('role', form)

  // The pending identity lives in an httpOnly cookie, so the only way to read it is to ask.
  // No cookie means the flow expired or was never started — back to sign-in rather than an
  // empty form that cannot submit.
  useEffect(() => {
    let cancelled = false

    getGooglePendingAPI()
      .then((value) => {
        if (cancelled) return
        setPending(value)
        form.setFieldsValue({
          role: value.role ?? USER_TYPES.consumer,
          firstName: value.firstName,
          lastName: value.lastName,
        })
        setIsLoading(false)
      })
      .catch(() => {
        if (!cancelled) replace(ROUTES.signIn)
      })

    return () => {
      cancelled = true
    }
  }, [form, replace])

  const handleFinish = async (values: CompleteRegistrationFormValues) => {
    setError(null)
    try {
      const session = await completeGoogle({
        role: values.role,
        phone: toPhoneNumber(values.code!, values.number),
        profile: {
          firstName: values.firstName,
          lastName: values.lastName,
          country: values.code,
          ...(values.role === USER_TYPES.provider ? toOrganizationFields(values.organization) : {}),
        },
      })
      push(session.role === USER_TYPES.provider ? ROUTES.providerProfileCreation : ROUTES.home)
    } catch (err) {
      setError(processError(err).message)
    }
  }

  if (isLoading) {
    return (
      <div className='flex justify-center py-10'>
        <Spin size='large' />
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-1 text-center'>
        <AppTitle level='h1' size='h2'>
          {t('completeRegistration.title')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('completeRegistration.subtitle', { email: pending?.email ?? '' })}
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
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor='role'>{t('completeRegistration.roleLabel')}</FieldLabel>
          <AppFormItem name='role'>
            <Segmented
              id='role'
              block
              options={[
                { label: t('roles.consumer'), value: USER_TYPES.consumer },
                { label: t('roles.provider'), value: USER_TYPES.provider },
              ]}
            />
          </AppFormItem>
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <RegistrationField
            name='firstName'
            label={t('fields.firstName')}
            placeholder={t('fields.firstNamePlaceholder')}
            icon={<UserIcon className='text-brand-muted h-4 w-4' />}
            rules={nameRules}
            autoComplete='given-name'
            disabled={isPending}
          />
          <RegistrationField
            name='lastName'
            label={t('fields.lastName')}
            placeholder={t('fields.lastNamePlaceholder')}
            icon={<UserIcon className='text-brand-muted h-4 w-4' />}
            rules={nameRules}
            autoComplete='family-name'
            disabled={isPending}
          />
        </div>

        <PhoneNumberField label={t('fields.phone')} disabled={isPending} />

        {role === USER_TYPES.provider && (
          <div className='flex flex-col gap-1.5'>
            <FieldLabel htmlFor='organization'>{t('fields.organization')}</FieldLabel>
            <AppFormItem name='organization' rules={organizationRules(t('validation.organizationRequired'))}>
              <OrganizationAutocomplete id='organization' disabled={isPending} />
            </AppFormItem>
          </div>
        )}

        {error && (
          <div role='alert' className='rounded-brand-sm bg-red-50 p-3'>
            <AppParagraph size='body-sm' className='m-0 text-red-700'>
              {error}
            </AppParagraph>
          </div>
        )}

        <AppButton htmlType='submit' type='primary' size='large' block loading={isPending}>
          {t('completeRegistration.submit')}
        </AppButton>
      </Form>
    </>
  )
}
