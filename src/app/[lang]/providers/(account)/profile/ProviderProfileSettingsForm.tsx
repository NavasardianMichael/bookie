'use client'

import { useEffect, useMemo, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Form } from 'antd'
import type { CountryCode } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { changePhoneAPI } from '@api/auth/main'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { ProviderProfile } from '@store/providers/profile/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { ROUTES } from '@constants/routes'
import { isFormValidationError } from '@helpers/error'
import { isUploadedAsset } from '@helpers/images'
import { toPhoneFormValues } from '@helpers/registration'
import { ChangePhoneForm, phoneChangeToSave } from '@components/settings/ChangePhoneForm'
import { DeleteAccountSection } from '@components/settings/DeleteAccountSection'
import { EmailVerifyField } from '@components/settings/EmailVerifyField'
import { ProfilePhotoField } from '@components/settings/ProfilePhotoField'
import { ProviderPageActions } from '@components/settings/ProviderPageActions'
import { SettingsActionBar, type SettingsPendingAction } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { UserIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  verifyEmailToken?: string
}

type FormValues = {
  firstName: string
  lastName: string
  description?: string
  email?: string
  code?: CountryCode
  number?: string
  image?: string | File
}

const mergeDraft = (profile: ProviderProfile): FormValues => {
  const draft = profile.draft
  const phone = toPhoneFormValues(profile.details.phone)
  return {
    firstName: draft?.firstName ?? profile.basic.firstName,
    lastName: draft?.lastName ?? profile.basic.lastName,
    description: (draft?.description ?? profile.basic.description) || '',
    email: profile.details.email ?? '',
    code: phone?.code,
    number: phone?.number ?? '',
    image: draft?.imageUrl ?? profile.basic.image,
  }
}

export const ProviderProfileSettingsForm = ({ verifyEmailToken }: Props) => {
  const t = useTranslations('Settings')
  const tErrors = useTranslations('Errors')
  const [form] = Form.useForm<FormValues>()
  const setAuthState = useAuthStore.use.setAuthState()
  const profileId = useAuthStore.use.profileId()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [dirty, setDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<SettingsPendingAction | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)
  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const descriptionRules = useFormItemRules('maxCharsForTextarea')

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false
    void getProviderProfileAPI()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        const values = mergeDraft(data)
        form.setFieldsValue(values)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(request)
      })
    return () => {
      cancelled = true
    }
  }, [form, request])

  /** `null` when a field failed its rules — antd already shows that under the field. */
  const readValidValues = async (): Promise<FormValues | null> => {
    try {
      return await form.validateFields()
    } catch (err) {
      if (!isFormValidationError(err)) setError(err)
      return null
    }
  }

  // Watch the live fields — `getFieldsValue()` warns if it runs before `<Form form>` mounts.
  const watchedFirstName = Form.useWatch('firstName', form)
  const watchedLastName = Form.useWatch('lastName', form)
  const displayName =
    `${watchedFirstName ?? profile?.basic.firstName ?? ''} ${watchedLastName ?? profile?.basic.lastName ?? ''}`.trim()

  const applyResult = (data: ProviderProfile) => {
    setProfile(data)
    const values = mergeDraft(data)
    form.setFieldsValue(values)
    const portrait = data.draft?.imageUrl ?? data.basic.image
    setAuthState({
      firstName: data.basic.firstName,
      lastName: data.basic.lastName,
      // Draft wins: Save draft writes the upload there, and the live column stays
      // `/logo.svg` until Publish. Only a real upload — the seed is not a face.
      image: isUploadedAsset(portrait ?? undefined) ? (portrait ?? null) : null,
    })
    setDirty(false)
  }

  /** Phone is live profile data, not part of the draft overlay, so either save writes it. */
  const withSavedPhone = async (data: ProviderProfile, values: FormValues): Promise<ProviderProfile> => {
    const nextPhone = phoneChangeToSave(profile?.details.phone, values.code, values.number)
    if (!nextPhone) return data
    const saved = await changePhoneAPI({ phone: nextPhone })
    return { ...data, details: { ...data.details, phone: saved.phone } }
  }

  const handleSaveDraft = async () => {
    const values = await readValidValues()
    if (!values) return
    setPendingAction('draft')
    setError(null)
    try {
      const data = await putProviderProfileAPI({
        mode: 'draft',
        firstName: values.firstName,
        lastName: values.lastName,
        description: values.description,
        image: values.image instanceof File ? values.image : undefined,
      })
      applyResult(await withSavedPhone(data, values))
    } catch (err) {
      setError(err)
    } finally {
      setPendingAction(null)
    }
  }

  const handlePublish = async () => {
    const values = await readValidValues()
    if (!values) return
    setPendingAction('publish')
    setError(null)
    try {
      // Ensure draft has latest fields, then publish.
      await putProviderProfileAPI({
        mode: 'draft',
        firstName: values.firstName,
        lastName: values.lastName,
        description: values.description,
        image: values.image instanceof File ? values.image : undefined,
      })
      const data = await putProviderProfileAPI({ mode: 'publish' })
      applyResult(await withSavedPhone(data, values))
    } catch (err) {
      setError(err)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand text-white relative overflow-hidden rounded-2xl p-8 shadow-lg'>
        <div className='pe-20'>
          <AppText size='caption' className='mb-4 inline-block rounded-full bg-white/20 px-3 py-1 font-bold tracking-widest text-white uppercase'>
            {profile?.listed === false ? t('listing.statusUnlisted') : t('listing.statusActive')}
          </AppText>
          <AppTitle level='h2' size='h2' className='text-white'>
            {t('providerHeroTitle')}
          </AppTitle>
          <AppParagraph tone='inverse' className='mt-2 max-w-md'>
            {t('providerHeroBody')}
          </AppParagraph>
        </div>
        <ProviderPageActions
          listed={profile?.listed !== false}
          profileId={profile?.id ?? profileId}
          disabled={!profile || pendingAction !== null}
          onListedChange={(listed) => {
            setProfile((prev) => (prev ? { ...prev, listed } : prev))
          }}
        />
        <div className='pointer-events-none absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent' />
      </div>

      <PageHeader title={t('nav.profile')} subtitle={t('profile.providerSubtitle')} />
      {error !== null && <ErrorAlert error={error} />}

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <UserIcon className='text-brand h-5 w-5' />
          {t('profile.personalInfo')}
        </AppTitle>

        {loadError !== null ? (
          <ErrorAlert
            error={loadError}
            title={tErrors('pages.settings')}
            onRetry={() => setRevision((current) => current + 1)}
            retrying={loading}
          />
        ) : (
          <Form
            form={form}
            layout='vertical'
            requiredMark={false}
            disabled={pendingAction !== null}
            onValuesChange={() => setDirty(true)}
            className='flex flex-col gap-4'
          >
            <AppFormItem name='image' hasFeedback={false}>
              <ProfilePhotoField
                name={displayName || 'Provider'}
                hint={t('profile.imageHint')}
                uploadLabel={t('profile.upload')}
              />
            </AppFormItem>

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
              <div className='flex flex-col gap-1.5 md:col-span-2'>
                <FieldLabel htmlFor='description' requirement='Optional'>
                  {t('profile.description')}
                </FieldLabel>
                <AppFormItem name='description' rules={descriptionRules} messageVariables={{ label: t('profile.description') }}>
                  <AppTextArea id='description' rows={4} maxLength={MAX_CHARS_FOR_TEXTAREA} />
                </AppFormItem>
              </div>
              <div className='md:col-span-2'>
                <ChangePhoneForm required={false} disabled={pendingAction !== null} />
              </div>
              <div className='md:col-span-2'>
                <EmailVerifyField
                  currentEmail={profile?.details.email}
                  verifyPath={ROUTES.providerProfile}
                  verifyToken={verifyEmailToken}
                  disabled={pendingAction !== null}
                  onVerified={(email, emailVerifiedAt) => {
                    setProfile((prev) =>
                      prev
                        ? { ...prev, details: { ...prev.details, email, emailVerifiedAt } }
                        : prev
                    )
                  }}
                />
              </div>
            </div>
          </Form>
        )}
      </Surface>

      <DeleteAccountSection disabled={!profile || pendingAction !== null} />

      {/* No Save over settings that never loaded: it would write the empty defaults. */}
      {loadError === null && (
        <SettingsActionBar
          dirty={dirty}
          pendingAction={pendingAction}
          onDiscard={() => {
            if (!profile) return
            const values = mergeDraft(profile)
            form.setFieldsValue(values)
            setDirty(false)
          }}
          onSaveDraft={() => void handleSaveDraft()}
          onPublish={() => void handlePublish()}
          saveDraftLabel={t('actions.saveDraft')}
          publishLabel={t('actions.publish')}
          discardLabel={t('actions.discard')}
        />
      )}
    </div>
  )
}
