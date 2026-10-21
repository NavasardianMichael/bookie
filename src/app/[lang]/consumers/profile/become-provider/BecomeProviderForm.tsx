'use client'

import { FC, useEffect, useState } from 'react'
import { CategoriesSection } from '@app/[lang]/auth/components/CategoriesSection'
import { OrganizationSection } from '@app/[lang]/auth/components/OrganizationSection'
import { PhoneFormValues, PhoneNumberField } from '@app/[lang]/auth/components/PhoneNumberField'
import { RegistrationField } from '@app/[lang]/auth/components/RegistrationField'
import { useSimilarCategoryCheck } from '@app/[lang]/auth/components/useSimilarCategoryCheck'
import { useSimilarOrganizationCheck } from '@app/[lang]/auth/components/useSimilarOrganizationCheck'
import { Form } from 'antd'
import { useTranslations } from 'next-intl'
import { getConsumerProfileAPI } from '@api/consumers/main'
import { useAuthStore } from '@store/auth/store'
import { Consumer } from '@store/consumers/profile/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useFormUnsavedGuard } from '@hooks/useUnsavedChangesGuard'
import { CategoryValue, NewOrganizationFormValues, OrganizationValue } from '@interfaces/auth'
import { useRouter } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'
import { toCategoryChoices, toPhoneFormValues, toPhoneNumber } from '@helpers/registration'
import { suppressUnsavedChangesGuard } from '@helpers/unsavedChangesGuard'
import { newAccountLandingPath } from '@helpers/workspace'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { BuildingIcon, UserIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type BecomeProviderFormValues = PhoneFormValues & {
  fullName: string
  organization?: OrganizationValue
  newOrganization?: NewOrganizationFormValues
  categories?: CategoryValue[]
}

/** The consumer's own answers, as provider registration would have asked for them. */
const valuesFromConsumer = (consumer: Consumer): BecomeProviderFormValues => {
  const phone = toPhoneFormValues(consumer.basic.phone ?? consumer.basic.phoneNumber)
  return {
    fullName: consumer.basic.fullName,
    code: phone?.code,
    number: phone?.number ?? '',
    organization: undefined,
    categories: [],
  }
}

/**
 * Provider registration for an account that already exists: the same name, phone and
 * Organization fields, prefilled from the Consumer profile, and none of the account half —
 * the email and password are the `User`'s already, so they are named, not asked for.
 *
 * Submitting creates the Provider row and re-issues the session as provider
 * (`POST /identity/provider-profile`), then opens Availability, as a new provider's
 * sign-up does. An account that already holds a Provider profile is sent to it instead.
 */
export const BecomeProviderForm: FC = () => {
  const t = useTranslations('Settings')
  const tAuth = useTranslations('Auth')
  const tErrors = useTranslations('Errors')
  const { replace } = useRouter()
  const [form] = Form.useForm<BecomeProviderFormValues>()
  const unsaved = useFormUnsavedGuard()
  const becomeProvider = useAuthStore.use.becomeProvider()
  const isPending = useAuthStore.use.isPending()
  const profiles = useAuthStore.use.profiles()
  const [consumer, setConsumer] = useState<Consumer | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  /** Bumped by Retry to ask for the profile again. */
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const nameRules = useFormItemRules('required', 'maxCharsForName')
  const { resolveOrganization, isChecking, dialog } = useSimilarOrganizationCheck((organization) =>
    form.setFieldValue('organization', { id: organization.id, name: organization.basic.name })
  )
  const categoryCheck = useSimilarCategoryCheck((categories) => form.setFieldValue('categories', categories))

  useEffect(() => {
    if (!profiles?.provider) return
    // An automatic bounce, not the visitor abandoning the form.
    suppressUnsavedChangesGuard()
    replace(ROUTES.providerProfile)
  }, [profiles, replace])

  useEffect(() => {
    let cancelled = false
    void getConsumerProfileAPI()
      .then((data) => {
        if (cancelled) return
        setConsumer(data)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err)
      })
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  const handleFinish = async (values: BecomeProviderFormValues) => {
    setSubmitError(null)
    const organization = await resolveOrganization(values.organization, values.newOrganization)
    if (!organization) return
    const categories = await categoryCheck.resolveCategories(values.categories)
    if (!categories) return

    try {
      const session = await becomeProvider({
        phone: toPhoneNumber(values.code!, values.number),
        profile: {
          fullName: values.fullName,
          country: values.code,
          ...organization,
          categories: toCategoryChoices(categories),
        },
      })
      // `replace`: back would only land on a form this account can no longer use.
      unsaved.release()
      replace(newAccountLandingPath(session.role))
    } catch (error) {
      setSubmitError(error)
    }
  }

  const busy = isPending || isChecking || categoryCheck.isChecking

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('becomeProvider.title')} subtitle={t('becomeProvider.subtitle')} />

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <BuildingIcon className='text-brand h-5 w-5' />
          {t('becomeProvider.formTitle')}
        </AppTitle>

        {loadError !== null ? (
          <ErrorAlert
            error={loadError}
            title={tErrors('pages.settings')}
            onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
          />
        ) : !consumer ? (
          <div className='bg-brand-50 min-h-40 animate-pulse rounded-brand' />
        ) : (
          <Form
            form={form}
            name='becomeProvider'
            layout='vertical'
            requiredMark={false}
            initialValues={valuesFromConsumer(consumer)}
            onFinish={handleFinish}
            onValuesChange={() => {
              unsaved.mark()
              setSubmitError(null)
            }}
            scrollToFirstError
            className='flex w-full flex-col gap-4'
          >
            {submitError !== null && <ErrorAlert error={submitError} />}

            {consumer.basic.email && (
              <AppParagraph size='body-sm' className='m-0'>
                {t('becomeProvider.accountNote', { email: consumer.basic.email })}
              </AppParagraph>
            )}

            <RegistrationField
              name='fullName'
              label={tAuth('fields.fullName')}
              requirement='Required'
              placeholder={tAuth('fields.fullName')}
              autoComplete='name'
              rules={nameRules}
              icon={<UserIcon className='text-brand-muted h-4 w-4' />}
              disabled={busy}
            />

            <PhoneNumberField label={tAuth('fields.phone')} requirement='Required' disabled={busy} />

            <CategoriesSection disabled={busy} />

            <OrganizationSection disabled={busy} />

            <AppButton type='primary' variant='solid' htmlType='submit' className='mt-2 self-start' loading={busy}>
              {t('becomeProvider.submit')}
            </AppButton>

            {dialog}
            {categoryCheck.dialog}
          </Form>
        )}
      </Surface>
    </div>
  )
}
