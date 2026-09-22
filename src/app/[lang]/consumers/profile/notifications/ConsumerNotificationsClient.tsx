'use client'

import { useEffect, useState } from 'react'
import { Alert, Form, Switch } from 'antd'
import { useTranslations } from 'next-intl'
import { getConsumerProfileAPI, putConsumerProfileAPI } from '@api/consumers/main'
import { ConsumerEmailNotificationPrefs } from '@interfaces/settings'
import { DEFAULT_CONSUMER_NOTIFICATION_PREFS, toAppointmentReminderLeadMinutes } from '@constants/settings'
import { processError } from '@helpers/error'
import { AppointmentReminderPref } from '@components/settings/AppointmentReminderPref'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { BellIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type PrefKey = Exclude<keyof ConsumerEmailNotificationPrefs, 'appointmentReminderMinutes'>

const ROWS: { key: PrefKey; titleKey: string; descKey: string }[] = [
  { key: 'bookingChanges', titleKey: 'changesTitle', descKey: 'changesBody' },
  { key: 'marketing', titleKey: 'marketingTitle', descKey: 'marketingBody' },
]

export const ConsumerNotificationsClient = () => {
  const t = useTranslations('Settings')
  const [form] = Form.useForm<ConsumerEmailNotificationPrefs>()
  const [saved, setSaved] = useState<ConsumerEmailNotificationPrefs>({ ...DEFAULT_CONSUMER_NOTIFICATION_PREFS })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getConsumerProfileAPI()
      .then((profile) => {
        const prefs = {
          ...DEFAULT_CONSUMER_NOTIFICATION_PREFS,
          ...profile.details.emailNotificationPrefs,
          appointmentReminderMinutes: toAppointmentReminderLeadMinutes(
            profile.details.emailNotificationPrefs?.appointmentReminderMinutes
          ),
        }
        setSaved(prefs)
        form.setFieldsValue(prefs)
      })
      .catch((err) => setError(processError(err).message))
      .finally(() => setLoading(false))
  }, [form])

  const handleSave = async () => {
    const values = form.getFieldsValue(true)
    setSaving(true)
    setError(null)
    try {
      await putConsumerProfileAPI({ emailNotificationPrefs: values })
      setSaved(values)
      setDirty(false)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.notifications')} subtitle={t('notifications.subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <BellIcon className='text-brand h-5 w-5' />
          {t('notifications.emailPrefs')}
        </AppTitle>

        {loading ? (
          <div className='bg-brand-50 min-h-40 animate-pulse rounded-brand' />
        ) : (
          <Form
            form={form}
            initialValues={saved}
            disabled={saving}
            onValuesChange={() => setDirty(true)}
            className='flex flex-col gap-0'
          >
            <AppointmentReminderPref />
            {ROWS.map((row) => (
              <div
                key={row.key}
                className='border-brand-border flex items-center justify-between gap-4 border-t py-4'
              >
                <div>
                  <AppText className='font-bold'>{t(`notifications.${row.titleKey}`)}</AppText>
                  <AppParagraph size='body-sm'>{t(`notifications.${row.descKey}`)}</AppParagraph>
                </div>
                <AppFormItem name={row.key} valuePropName='checked' className='m-0'>
                  <Switch />
                </AppFormItem>
              </div>
            ))}
          </Form>
        )}
      </Surface>

      <SettingsActionBar
        dirty={dirty}
        pendingAction={saving ? 'save' : null}
        onDiscard={() => {
          form.setFieldsValue(saved)
          setDirty(false)
        }}
        onSave={() => void handleSave()}
        saveLabel={t('actions.save')}
        discardLabel={t('actions.discard')}
      />
    </div>
  )
}
