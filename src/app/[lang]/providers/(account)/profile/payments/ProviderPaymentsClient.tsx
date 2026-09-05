'use client'

import { useEffect, useState } from 'react'
import { Alert, App, Form } from 'antd'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { PaymentInfo } from '@interfaces/settings'
import { processError } from '@helpers/error'
import { PaymentInfoFields } from '@components/settings/PaymentInfoFields'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { CopyIcon, CreditCardIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type FormValues = { paymentInfo: PaymentInfo }

const DEFAULT: PaymentInfo = { method: 'cash', reference: '', notes: '' }

export const ProviderPaymentsClient = () => {
  const t = useTranslations('Settings')
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [saved, setSaved] = useState<PaymentInfo>(DEFAULT)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => {
        const info =
          (profile.draft?.paymentInfo as PaymentInfo | undefined) ?? profile.details.paymentInfo ?? DEFAULT
        setSaved(info)
        form.setFieldsValue({ paymentInfo: info })
      })
      .catch((err) => setError(processError(err).message))
  }, [form])

  const persist = async (mode: 'draft' | 'publish') => {
    const values = await form.validateFields()
    setSaving(true)
    setError(null)
    try {
      await putProviderProfileAPI({ mode: 'draft', paymentInfo: values.paymentInfo })
      if (mode === 'publish') {
        await putProviderProfileAPI({ mode: 'publish' })
      }
      const profile = await getProviderProfileAPI()
      const info =
        (profile.draft?.paymentInfo as PaymentInfo | undefined) ?? profile.details.paymentInfo ?? DEFAULT
      setSaved(info)
      form.setFieldsValue({ paymentInfo: info })
      setDirty(false)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  const reference = Form.useWatch(['paymentInfo', 'reference'], form)

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.payments')} subtitle={t('payments.subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-6'>
        <h2 className='text-h3 flex items-center gap-2 font-bold'>
          <CreditCardIcon className='text-brand h-5 w-5' />
          {t('payments.title')}
        </h2>
        <AppParagraph size='body-sm'>{t('payments.hint')}</AppParagraph>

        <Form form={form} layout='vertical' onValuesChange={() => setDirty(true)} initialValues={{ paymentInfo: saved }}>
          <PaymentInfoFields />
        </Form>

        {reference ? (
          <div className='bg-surface-sunken border-brand-border flex items-center justify-between gap-3 rounded-brand border p-3'>
            <div className='min-w-0'>
              <AppText size='caption' tone='muted' className='font-bold uppercase'>
                {t('payments.copyable')}
              </AppText>
              <AppParagraph className='truncate font-semibold' tone='default'>
                {reference}
              </AppParagraph>
            </div>
            <AppButton
              type='default'
              icon={<CopyIcon className='h-4 w-4' />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reference)
                  message.success(t('payments.copied'))
                } catch {
                  message.error(t('payments.copyFailed'))
                }
              }}
            >
              {t('payments.copy')}
            </AppButton>
          </div>
        ) : null}
      </Surface>

      <SettingsActionBar
        dirty={dirty}
        saving={saving}
        onDiscard={() => {
          form.setFieldsValue({ paymentInfo: saved })
          setDirty(false)
        }}
        onSaveDraft={() => void persist('draft')}
        onPublish={() => void persist('publish')}
        saveDraftLabel={t('actions.saveDraft')}
        publishLabel={t('actions.publish')}
        discardLabel={t('actions.discard')}
      />
    </div>
  )
}
