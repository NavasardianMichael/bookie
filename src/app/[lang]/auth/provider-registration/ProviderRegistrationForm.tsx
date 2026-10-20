'use client'

import { useState } from 'react'
import { Alert, Divider, Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { CategoryValue, NewOrganizationFormValues, OrganizationValue } from '@interfaces/auth'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { toCategoryChoices, toPhoneNumber } from '@helpers/registration'
import { newAccountLandingPath } from '@helpers/workspace'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { ErrorState } from '@components/ui/ErrorState'
import { MailIcon, UserIcon } from '@components/ui/icons'
import { CategoriesSection } from '../components/CategoriesSection'
import { GoogleButton } from '../components/GoogleButton'
import { NewPasswordFields } from '../components/NewPasswordFields'
import { OrganizationSection } from '../components/OrganizationSection'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'
import { GoogleSignUpWaiting, useGoogleSignUp } from '../components/useGoogleSignUp'
import { useSimilarCategoryCheck } from '../components/useSimilarCategoryCheck'
import { useSimilarOrganizationCheck } from '../components/useSimilarOrganizationCheck'

type ProviderRegistrationFormValues = PhoneFormValues & {
  organization?: OrganizationValue
  newOrganization?: NewOrganizationFormValues
  categories?: CategoryValue[]
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

const INITIAL_VALUES: ProviderRegistrationFormValues = {
  fullName: '',
  email: '',
  code: undefined,
  number: '',
  password: '',
  confirmPassword: '',
  organization: undefined,
  categories: [],
}

/**
 * Provider registration, per `design/initial prototype/provider_registration`.
 *
 * The prototype's "Business Name" is an optional Organization section here, closed behind an
 * "Add organization" button because a sole trader has none: open, it searches existing
 * organizations or registers a new one with its public-page details in the same submit —
 * after asking, when an organization with a similar name already exists.
 * The full name is collected so a provider is never created with the server's placeholder
 * name, and the phone is required, as it is for consumers.
 *
 * **Submitting does not sign you in.** `POST /identity/register` creates the account and
 * mails a verification link; an unverified account cannot hold a session, so the funnel
 * continues from the recipient's inbox. The success screen says exactly that.
 *
 * **Google mode** (`viaGoogle`, from `?google=1`) is the same form for a first-time Google
 * account: name and email prefilled from what Google supplied, the email locked — it is
 * what Google verified — and no password. Submitting finishes the account through
 * `/identity/google/complete`, which signs it in, so it lands where a new provider starts.
 */
type Props = {
  viaGoogle?: boolean
}

export const ProviderRegistrationForm: React.FC<Props> = ({ viaGoogle = false }) => {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const { push, replace } = useRouter()
  const [form] = Form.useForm<ProviderRegistrationFormValues>()
  const register = useAuthStore.use.register()
  const completeGoogle = useAuthStore.use.completeGoogle()
  const isPending = useAuthStore.use.isPending()
  const [submitError, setSubmitError] = useState<unknown>(null)
  const google = useGoogleSignUp(viaGoogle)
  const pending = google.status === 'ready' ? google.pending : null

  const nameRules = useFormItemRules('required', 'maxCharsForName')
  const emailRules = useFormItemRules('required', 'email')
  const { resolveOrganization, isChecking, dialog } = useSimilarOrganizationCheck((organization) =>
    form.setFieldValue('organization', { id: organization.id, name: organization.basic.name })
  )
  const categoryCheck = useSimilarCategoryCheck((categories) => form.setFieldValue('categories', categories))

  const handleFinish = async (values: ProviderRegistrationFormValues) => {
    setSubmitError(null)
    const organization = await resolveOrganization(values.organization, values.newOrganization)
    if (!organization) return
    const categories = await categoryCheck.resolveCategories(values.categories)
    if (!categories) return

    const phone = toPhoneNumber(values.code!, values.number)
    const profile = {
      fullName: values.fullName,
      country: values.code,
      ...organization,
      categories: toCategoryChoices(categories),
    }

    if (pending) {
      try {
        const session = await completeGoogle({ role: USER_TYPES.provider, phone, profile })
        // `replace`: the identity this form finished is spent, so back has nothing to return to.
        replace(newAccountLandingPath(session.role))
      } catch (error) {
        setSubmitError(error)
      }
      return
    }

    try {
      await register({
        role: USER_TYPES.provider,
        email: values.email,
        password: values.password,
        phone,
        profile,
        locale,
      })
      push(ROUTES.verifyEmail)
    } catch (error) {
      setSubmitError(error)
    }
  }

  if (google.status === 'loading') return <GoogleSignUpWaiting />
  if (google.status === 'failed') return <ErrorState error={google.error} onRetry={google.retry} />

  return (
    <>
      {google.status === 'expired' && <Alert type='info' showIcon title={t('googleSignUp.expired')} />}

      {!pending && (
        <>
          <GoogleButton role={USER_TYPES.provider} disabled={isPending} />

          {/* Inline, not `my-0!`: a `!` suffix cannot beat antd's unlayered cssinjs, and the
              column already owns its spacing through the parent flex `gap`. */}
          <Divider plain style={{ margin: 0 }}>
            <span className='text-caption text-brand-muted'>{t('orWithEmail')}</span>
          </Divider>
        </>
      )}

      <Form
        form={form}
        name='providerRegistration'
        layout='vertical'
        requiredMark={false}
        initialValues={
          pending ? { ...INITIAL_VALUES, fullName: pending.fullName, email: pending.email } : INITIAL_VALUES
        }
        onFinish={handleFinish}
        onValuesChange={() => setSubmitError(null)}
        scrollToFirstError
        className='flex w-full flex-col gap-4'
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
          labelClassName='text-brand font-semibold'
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
            labelClassName='text-brand font-semibold'
          />
          {pending && (
            <AppText size='caption' tone='muted'>
              {t('googleSignUp.emailFromGoogle')}
            </AppText>
          )}
        </div>

        <PhoneNumberField
          label={t('fields.phone')}
          requirement='Required'
          disabled={isPending}
          labelClassName='text-brand font-semibold'
        />

        {!pending && (
          <NewPasswordFields
            emailFieldName='email'
            placeholder={t('fields.choosePasswordPlaceholder')}
            requirement='Required'
            disabled={isPending}
          />
        )}

        <CategoriesSection disabled={isPending} labelClassName='text-brand font-semibold' />

        <OrganizationSection disabled={isPending} labelClassName='text-brand font-semibold' />

        <AppButton
          type='primary'
          variant='solid'
          htmlType='submit'
          className='mt-4 w-full'
          loading={isPending || isChecking || categoryCheck.isChecking}
        >
          {t('providerRegistration.submit')}
        </AppButton>

        {dialog}
        {categoryCheck.dialog}
      </Form>
    </>
  )
}
