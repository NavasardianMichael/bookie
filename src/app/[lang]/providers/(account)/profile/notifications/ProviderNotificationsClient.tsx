'use client'

import { useEffect, useMemo, useState } from 'react'
import { Form, Switch } from 'antd'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { ProviderEmailNotificationPrefs } from '@interfaces/settings'
import { DEFAULT_PROVIDER_NOTIFICATION_PREFS, toAppointmentReminderLeadMinutes } from '@constants/settings'
import { AppointmentReminderPref } from '@components/settings/AppointmentReminderPref'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { BellIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type PrefKey = Exclude<keyof ProviderEmailNotificationPrefs, 'appointmentReminderMinutes'>

const ROWS: { key: PrefKey; titleKey: string; descKey: string }[] = [
  { key: 'newBooking', titleKey: 'newBookingTitle', descKey: 'newBookingBody' },
  { key: 'bookingChanges', titleKey: 'changesTitle', descKey: 'changesBody' },
]

export const ProviderNotificationsClient = () => {
  const t = useTranslations('Settings')
  const tErrors = useTranslations('Errors')
  const [form] = Form.useForm<ProviderEmailNotificationPrefs>()
  const [saved, setSaved] = useState<ProviderEmailNotificationPrefs>({
    ...DEFAULT_PROVIDER_NOTIFICATION_PREFS,
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false
    void getProviderProfileAPI()
      .then((profile) => {
        if (cancelled) return
        const prefs = {
          ...DEFAULT_PROVIDER_NOTIFICATION_PREFS,
          ...profile.details.emailNotificationPrefs,
          appointmentReminderMinutes: toAppointmentReminderLeadMinutes(
            profile.details.emailNotificationPrefs?.appointmentReminderMinutes
          ),
        }
        setSaved(prefs)
        form.setFieldsValue(prefs)
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

  const handleSave = async () => {
    const values = form.getFieldsValue(true)
    setSaving(true)
    setError(null)
    try {
      await putProviderProfileAPI({ emailNotificationPrefs: values })
      setSaved(values)
      setDirty(false)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.notifications')} subtitle={t('notifications.subtitle')} />
      {error !== null && <ErrorAlert error={error} />}

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <BellIcon className='text-brand h-5 w-5' />
          {t('notifications.emailPrefs')}
        </AppTitle>

        {loadError !== null ? (
          <ErrorAlert
            error={loadError}
            title={tErrors('pages.settings')}
            onRetry={() => setRevision((current) => current + 1)}
            retrying={loading}
          />
        ) : (
          <Form form={form} initialValues={saved} disabled={saving} onValuesChange={() => setDirty(true)}>
            {ROWS.slice(0, 1).map((row) => (
              <div key={row.key} className='flex items-center justify-between gap-4 py-4'>
                <div>
                  <AppText className='font-bold'>{t(`notifications.${row.titleKey}`)}</AppText>
                  <AppParagraph size='body-sm'>{t(`notifications.${row.descKey}`)}</AppParagraph>
                </div>
                <AppFormItem name={row.key} valuePropName='checked' className='m-0'>
                  <Switch />
                </AppFormItem>
              </div>
            ))}
            <AppointmentReminderPref showTopBorder />
            {ROWS.slice(1).map((row) => (
              <div key={row.key} className='border-brand-border flex items-center justify-between gap-4 border-t py-4'>
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

      {/* No Save over settings that never loaded: it would write the empty defaults. */}
      {loadError === null && (
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
      )}
    </div>
  )
}
