'use client'

import { useEffect, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Form } from 'antd'
import { useTranslations } from 'next-intl'
import { getConsumerProfileAPI, putConsumerProfileAPI } from '@api/consumers/main'
import { Consumer } from '@store/consumers/profile/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { EmailVerifyField } from '@components/settings/EmailVerifyField'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { HelpIcon, UserIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  verifyEmailToken?: string
}

type ProfileFormValues = {
  firstName: string
  lastName: string
  description?: string
  email?: string
}

export const ConsumerProfileForm = ({ verifyEmailToken }: Props) => {
  const t = useTranslations('Settings')
  const [form] = Form.useForm<ProfileFormValues>()
  const [profile, setProfile] = useState<Consumer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const descriptionRules = useFormItemRules('maxCharsForTextarea')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getConsumerProfileAPI()
        if (cancelled) return
        setProfile(data)
        form.setFieldsValue({
          firstName: data.basic.firstName,
          lastName: data.basic.lastName,
          description: data.details.description ?? data.basic.description ?? '',
          email: data.basic.email ?? '',
        })
      } catch (err) {
        if (!cancelled) setError(processError(err).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [form])

  const handleDiscard = () => {
    if (!profile) return
    form.setFieldsValue({
      firstName: profile.basic.firstName,
      lastName: profile.basic.lastName,
      description: profile.details.description ?? profile.basic.description ?? '',
      email: profile.basic.email ?? '',
    })
    setDirty(false)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    setError(null)
    try {
      const updated = await putConsumerProfileAPI({
        firstName: values.firstName,
        lastName: values.lastName,
        description: values.description?.trim() || null,
      })
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              details: { ...prev.details, ...updated.details },
            }
          : updated
      )
      setDirty(false)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile
    ? `${profile.basic.firstName} ${profile.basic.lastName}`.trim()
    : t('consumerAccount')

  if (loading) {
    return <Surface className='min-h-64 animate-pulse' />
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('accountSettings')} subtitle={t('consumerSubtitle')} />

      {error && <Alert type='error' showIcon message={error} />}

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

        <Form
          form={form}
          layout='vertical'
          requiredMark={false}
          onValuesChange={() => setDirty(true)}
          className='flex flex-col gap-4'
        >
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
              <AppFormItem
                name='description'
                rules={descriptionRules}
                messageVariables={{ label: t('profile.description') }}
              >
                <AppTextArea id='description' rows={3} maxLength={MAX_CHARS_FOR_TEXTAREA} />
              </AppFormItem>
            </div>
            <div className='md:col-span-2'>
              <EmailVerifyField
                currentEmail={profile?.basic.email}
                emailVerifiedAt={profile?.details.emailVerifiedAt}
                verifyPath={ROUTES.consumerProfile}
                verifyToken={verifyEmailToken}
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
        </Form>
      </Surface>

      <Surface className='flex flex-col gap-3'>
        <AppTitle level='h3' size='body' className='flex items-center gap-2'>
          <HelpIcon className='h-4 w-4' />
          {t('needHelp.title')}
        </AppTitle>
        <AppParagraph size='body-sm'>{t('needHelp.body')}</AppParagraph>
        <AppLink href={ROUTES.contact} variant='button' tone='default' className='self-start'>
          {t('needHelp.cta')}
        </AppLink>
      </Surface>

      <SettingsActionBar
        dirty={dirty}
        saving={saving}
        onDiscard={handleDiscard}
        onSave={() => void handleSave()}
        saveLabel={t('actions.save')}
        discardLabel={t('actions.discard')}
      />
    </div>
  )
}
