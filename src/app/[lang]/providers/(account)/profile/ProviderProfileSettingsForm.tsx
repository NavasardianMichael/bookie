'use client'

import { useEffect, useMemo, useState } from 'react'
import { UploadOutlined } from '@ant-design/icons'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Form, Input, Upload } from 'antd'
import ImgCrop from 'antd-img-crop'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { ProviderProfile } from '@store/providers/profile/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { resolveAssetUrl } from '@helpers/images'
import { EmailVerifyField } from '@components/settings/EmailVerifyField'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { UserIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

const { TextArea } = Input

type FormValues = {
  firstName: string
  lastName: string
  description?: string
  email?: string
  image?: string | File
}

const mergeDraft = (profile: ProviderProfile): FormValues => {
  const draft = profile.draft
  return {
    firstName: draft?.firstName ?? profile.basic.firstName,
    lastName: draft?.lastName ?? profile.basic.lastName,
    description: (draft?.description ?? profile.basic.description) || '',
    email: profile.details.email ?? '',
    image: draft?.imageUrl ?? profile.basic.image,
  }
}

export const ProviderProfileSettingsForm = () => {
  const t = useTranslations('Settings')
  const [form] = Form.useForm<FormValues>()
  const setAuthState = useAuthStore.use.setAuthState()
  const profileId = useAuthStore.use.profileId()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [preview, setPreview] = useState<string | undefined>()
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const nameRules = useFormItemRules('required', 'maxCharsForInput')

  useEffect(() => {
    void getProviderProfileAPI()
      .then((data) => {
        setProfile(data)
        const values = mergeDraft(data)
        form.setFieldsValue(values)
        setPreview(typeof values.image === 'string' ? resolveAssetUrl(values.image) : undefined)
      })
      .catch((err) => setError(processError(err).message))
      .finally(() => setLoading(false))
  }, [form])

  const displayName = useMemo(() => {
    const v = form.getFieldsValue()
    return `${v.firstName ?? profile?.basic.firstName ?? ''} ${v.lastName ?? profile?.basic.lastName ?? ''}`.trim()
  }, [form, profile])

  const applyResult = (data: ProviderProfile) => {
    setProfile(data)
    const values = mergeDraft(data)
    form.setFieldsValue(values)
    setPreview(typeof values.image === 'string' ? resolveAssetUrl(values.image) : undefined)
    setAuthState({
      firstName: data.basic.firstName,
      lastName: data.basic.lastName,
      image: data.basic.image ?? null,
    })
    setDirty(false)
  }

  const handleSaveDraft = async () => {
    const values = await form.validateFields()
    setSaving(true)
    setError(null)
    try {
      const data = await putProviderProfileAPI({
        mode: 'draft',
        firstName: values.firstName,
        lastName: values.lastName,
        description: values.description,
        image: values.image instanceof File ? values.image : undefined,
      })
      applyResult(data)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    const values = await form.validateFields()
    setSaving(true)
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
      applyResult(data)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Surface className='min-h-64 animate-pulse' />

  return (
    <div className='flex flex-col gap-6'>
      <div className='bg-brand text-white relative overflow-hidden rounded-2xl p-8 shadow-lg'>
        <AppText size='caption' className='mb-4 inline-block rounded-full bg-white/20 px-3 py-1 font-bold tracking-widest text-white uppercase'>
          {profile?.listed === false ? t('listing.statusUnlisted') : t('listing.statusActive')}
        </AppText>
        <AppTitle level='h2' size='h2' className='text-white'>
          {t('providerHeroTitle')}
        </AppTitle>
        <AppParagraph className='mt-2 max-w-md text-white/70'>{t('providerHeroBody')}</AppParagraph>
        <div className='relative z-10 mt-6 flex flex-wrap gap-3'>
          {profileId && (
            <AppLink href={`${ROUTES.providers}/${profileId}`} variant='button' tone='default'>
              {t('listing.preview')}
            </AppLink>
          )}
        </div>
        <div className='pointer-events-none absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent' />
      </div>

      <PageHeader title={t('nav.profile')} subtitle={t('profile.providerSubtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <UserIcon className='text-brand h-5 w-5' />
          {t('profile.personalInfo')}
        </AppTitle>

        <Form form={form} layout='vertical' requiredMark={false} onValuesChange={() => setDirty(true)} className='flex flex-col gap-4'>
          <div className='border-brand-border flex flex-wrap items-center gap-6 border-b pb-6'>
            <AppAvatar src={preview} name={displayName || 'Provider'} size={80} />
            <div className='flex flex-col gap-2'>
              <AppParagraph size='body-sm'>{t('profile.imageHint')}</AppParagraph>
              <ImgCrop aspect={1}>
                <Upload
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    form.setFieldValue('image', file)
                    setPreview(URL.createObjectURL(file))
                    setDirty(true)
                    return false
                  }}
                >
                  <AppButton icon={<UploadOutlined />}>{t('profile.upload')}</AppButton>
                </Upload>
              </ImgCrop>
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
            <div className='flex flex-col gap-1.5 md:col-span-2'>
              <FieldLabel htmlFor='description' requirement='Optional'>
                {t('profile.description')}
              </FieldLabel>
              <AppFormItem name='description' messageVariables={{ label: t('profile.description') }}>
                <TextArea id='description' rows={4} />
              </AppFormItem>
            </div>
            <div className='md:col-span-2'>
              <EmailVerifyField
                currentEmail={profile?.details.email}
                emailVerifiedAt={profile?.details.emailVerifiedAt}
              />
            </div>
          </div>
        </Form>
      </Surface>

      <SettingsActionBar
        dirty={dirty}
        saving={saving}
        onDiscard={() => {
          if (!profile) return
          const values = mergeDraft(profile)
          form.setFieldsValue(values)
          setPreview(typeof values.image === 'string' ? resolveAssetUrl(values.image) : undefined)
          setDirty(false)
        }}
        onSaveDraft={() => void handleSaveDraft()}
        onPublish={() => void handlePublish()}
        saveDraftLabel={t('actions.saveDraft')}
        publishLabel={t('actions.publish')}
        discardLabel={t('actions.discard')}
      />
    </div>
  )
}
