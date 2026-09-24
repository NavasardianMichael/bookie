'use client'

import { useEffect, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Form } from 'antd'
import type { CountryCode } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { changePhoneAPI } from '@api/auth/main'
import { getConsumerProfileAPI, putConsumerProfileAPI } from '@api/consumers/main'
import { Consumer } from '@store/consumers/profile/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { PaymentMethod } from '@interfaces/settings'
import { ROUTES } from '@constants/routes'
import { isFormValidationError } from '@helpers/error'
import { toPaymentMethods } from '@helpers/payment'
import { toPhoneFormValues } from '@helpers/registration'
import { ChangePhoneForm, phoneChangeToSave } from '@components/settings/ChangePhoneForm'
import { DeleteAccountSection } from '@components/settings/DeleteAccountSection'
import { EmailVerifyField } from '@components/settings/EmailVerifyField'
import { PaymentMethodPicker } from '@components/settings/PaymentMethodPicker'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { CreditCardIcon, HelpIcon, UserIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  verifyEmailToken?: string
}

type ProfileFormValues = {
  firstName: string
  lastName: string
  email?: string
  code?: CountryCode
  number?: string
  paymentInfo: { methods: PaymentMethod[] }
}

const DEFAULT_PAYMENT: ProfileFormValues['paymentInfo'] = { methods: ['cash'] }

const paymentFromProfile = (profile: Consumer): ProfileFormValues['paymentInfo'] => {
  const methods = toPaymentMethods(profile.details.paymentInfo)
  return methods.length ? { methods } : DEFAULT_PAYMENT
}

const valuesFromProfile = (profile: Consumer): ProfileFormValues => {
  const phone = toPhoneFormValues(profile.basic.phone ?? profile.basic.phoneNumber)
  return {
    firstName: profile.basic.firstName,
    lastName: profile.basic.lastName,
    email: profile.basic.email ?? '',
    code: phone?.code,
    number: phone?.number ?? '',
    paymentInfo: paymentFromProfile(profile),
  }
}

export const ConsumerProfileForm = ({ verifyEmailToken }: Props) => {
  const t = useTranslations('Settings')
  const tErrors = useTranslations('Errors')
  const [form] = Form.useForm<ProfileFormValues>()
  const [profile, setProfile] = useState<Consumer | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  /** Bumped by Retry to ask for the profile again. */
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const nameRules = useFormItemRules('required', 'maxCharsForInput')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getConsumerProfileAPI()
        if (cancelled) return
        setProfile(data)
        form.setFieldsValue(valuesFromProfile(data))
      } catch (err) {
        if (!cancelled) setLoadError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [form, loadAttempt])

  const retryLoad = () => {
    setLoadError(null)
    setLoading(true)
    setLoadAttempt((attempt) => attempt + 1)
  }

  const handleDiscard = () => {
    if (!profile) return
    form.setFieldsValue(valuesFromProfile(profile))
    setDirty(false)
  }

  const handleSave = async () => {
    setError(null)
    let values: ProfileFormValues
    try {
      values = await form.validateFields()
    } catch (err) {
      // A failed rule is already shown under its field; anything else is not.
      if (!isFormValidationError(err)) setError(err)
      return
    }

    setSaving(true)
    try {
      const updated = await putConsumerProfileAPI({
        firstName: values.firstName,
        lastName: values.lastName,
        paymentInfo: { methods: toPaymentMethods(values.paymentInfo) },
      })
      const currentPhone = profile?.basic.phone ?? profile?.basic.phoneNumber
      const nextPhone = phoneChangeToSave(currentPhone, values.code, values.number)
      const savedPhone = nextPhone ? (await changePhoneAPI({ phone: nextPhone })).phone : undefined
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              basic: { ...prev.basic, ...updated.basic, ...(savedPhone ? { phone: savedPhone } : {}) },
              details: { ...prev.details, ...updated.details },
            }
          : updated
      )
      setDirty(false)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile ? `${profile.basic.firstName} ${profile.basic.lastName}`.trim() : t('consumerAccount')

  if (loading) {
    return <Surface className='min-h-64 animate-pulse' />
  }

  // No form to fall back to: empty fields under a live Save would overwrite the real profile.
  if (loadError !== null) {
    return (
      <div className='flex flex-col gap-6'>
        <PageHeader title={t('accountSettings')} subtitle={t('consumerSubtitle')} />
        <ErrorAlert error={loadError} title={tErrors('pages.settings')} onRetry={retryLoad} />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('accountSettings')} subtitle={t('consumerSubtitle')} />

      {error !== null && <ErrorAlert error={error} />}

      <Form
        form={form}
        layout='vertical'
        requiredMark={false}
        disabled={saving}
        onValuesChange={() => setDirty(true)}
        className='flex flex-col gap-6'
      >
        <Surface className='flex flex-col gap-6'>
          <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
            <UserIcon className='text-brand h-5 w-5' />
            {t('profile.personalInfo')}
          </AppTitle>

          <div className='border-brand-border flex items-center gap-6 border-b pb-6'>
            <AppAvatar name={displayName} size={80} />
            <div>
              <AppTitle level='h3' size='body'>
                {displayName}
              </AppTitle>
              <AppParagraph size='body-sm'>{t('profile.noAvatarHint')}</AppParagraph>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel htmlFor='firstName'>{t('profile.firstName')}</FieldLabel>
              <AppFormItem name='firstName' rules={nameRules} messageVariables={{ label: t('profile.firstName') }}>
                <AppInput id='firstName' autoComplete='given-name' />
              </AppFormItem>
            </div>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel htmlFor='lastName'>{t('profile.lastName')}</FieldLabel>
              <AppFormItem name='lastName' rules={nameRules} messageVariables={{ label: t('profile.lastName') }}>
                <AppInput id='lastName' autoComplete='family-name' />
              </AppFormItem>
            </div>
            <div className='md:col-span-2'>
              <ChangePhoneForm disabled={saving} />
            </div>
            <div className='md:col-span-2'>
              <EmailVerifyField
                currentEmail={profile?.basic.email}
                verifyPath={ROUTES.consumerProfile}
                verifyToken={verifyEmailToken}
                disabled={saving}
                onVerified={(email, emailVerifiedAt) => {
                  setProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          basic: { ...prev.basic, email },
                          details: { ...prev.details, emailVerifiedAt },
                        }
                      : prev
                  )
                }}
              />
            </div>
          </div>
        </Surface>

        <Surface className='flex flex-col gap-6'>
          <div className='flex flex-col gap-1'>
            <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
              <CreditCardIcon className='text-brand h-5 w-5' />
              {t('payments.title')}
            </AppTitle>
            <AppParagraph size='body-sm'>{t('payments.subtitlePay')}</AppParagraph>
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel htmlFor='consumer-payment-methods'>{t('payments.methodsLabel')}</FieldLabel>
            <AppFormItem
              name={['paymentInfo', 'methods']}
              hasFeedback={false}
              messageVariables={{ label: t('payments.methodsLabel') }}
            >
              <PaymentMethodPicker htmlId='consumer-payment-methods' />
            </AppFormItem>
          </div>
        </Surface>
      </Form>

      <Surface className='flex flex-col gap-6'>
        <div className='flex flex-col gap-1'>
          <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
            <HelpIcon className='text-brand h-5 w-5' />
            {t('needHelp.title')}
          </AppTitle>
          <AppParagraph size='body-sm'>{t('needHelp.body')}</AppParagraph>
        </div>
        <AppLink href={ROUTES.contact} variant='button' tone='default' className='self-start'>
          {t('needHelp.cta')}
        </AppLink>
      </Surface>

      <DeleteAccountSection disabled={saving} />

      <SettingsActionBar
        dirty={dirty}
        pendingAction={saving ? 'save' : null}
        onDiscard={handleDiscard}
        onSave={() => void handleSave()}
        saveLabel={t('actions.save')}
        discardLabel={t('actions.discard')}
      />
    </div>
  )
}
