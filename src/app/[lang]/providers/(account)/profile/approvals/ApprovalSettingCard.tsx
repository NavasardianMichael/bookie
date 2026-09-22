'use client'

import { FC, useEffect, useState } from 'react'
import { Alert, Form, Switch } from 'antd'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { processError } from '@helpers/error'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CheckCircleIcon } from '@components/ui/icons'
import { Surface } from '@components/ui/layout/Surface'

type FormValues = { requiresBookingApproval: boolean }

type Props = {
  /** Told when the setting is saved, so the queue beside it refetches. */
  onSaved: (requiresApproval: boolean) => void
}

/**
 * The switch that decides whether a submitted booking waits for this provider.
 *
 * Explicit Discard / Save rather than saving on toggle, matching every other settings
 * tab — the app has no autosave anywhere (`src/app/CLAUDE.md`), and a control that
 * silently changes how the diary fills is the last one to make an exception for.
 *
 * It saves **live**, not into the draft overlay the public-facing tabs use. The draft
 * exists so a provider can rework the page people see without shipping it half-finished;
 * this changes nothing anyone sees. Staging it behind Publish would mean a provider who
 * switched approval on, saved a draft and walked away kept taking auto-confirmed
 * bookings they believed they were reviewing.
 */
export const ApprovalSettingCard: FC<Props> = ({ onSaved }) => {
  const t = useTranslations('Settings')
  const [form] = Form.useForm<FormValues>()
  const [saved, setSaved] = useState<FormValues>({ requiresBookingApproval: false })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => {
        // Absent on a payload written before the column existed; off is the API default.
        const values = { requiresBookingApproval: profile.details.requiresBookingApproval ?? false }
        setSaved(values)
        form.setFieldsValue(values)
      })
      .catch((err) => setError(processError(err).message))
  }, [form])

  const handleSave = async () => {
    const values = form.getFieldsValue(true) as FormValues
    setSaving(true)
    setError(null)
    try {
      await putProviderProfileAPI({ requiresBookingApproval: values.requiresBookingApproval })
      setSaved(values)
      setDirty(false)
      onSaved(values.requiresBookingApproval)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <CheckCircleIcon className='text-brand h-5 w-5' />
          {t('approvals.settingTitle')}
        </AppTitle>

        <Form form={form} initialValues={saved} disabled={saving} onValuesChange={() => setDirty(true)}>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <AppText className='font-bold'>{t('approvals.switchTitle')}</AppText>
              <AppParagraph size='body-sm'>{t('approvals.switchBody')}</AppParagraph>
            </div>
            <AppFormItem name='requiresBookingApproval' valuePropName='checked' className='m-0'>
              <Switch />
            </AppFormItem>
          </div>
        </Form>

        {/* Reads off `saved`, never the live form value: until Save lands, the booking
            page is still behaving the old way, and describing the unsaved position
            would be the screen telling the provider something untrue. */}
        <AppParagraph size='body-sm' tone='muted' className='m-0'>
          {saved.requiresBookingApproval ? t('approvals.stateOn') : t('approvals.stateOff')}
        </AppParagraph>
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
    </>
  )
}
