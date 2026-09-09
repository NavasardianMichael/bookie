'use client'

import { useEffect, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Form } from 'antd'
import { useTranslations } from 'next-intl'
import { getConsumerProfileAPI, putConsumerProfileAPI } from '@api/consumers/main'
import { PaymentMethod } from '@interfaces/settings'
import { processError } from '@helpers/error'
import { toPaymentMethods } from '@helpers/payment'
import { PaymentMethodPicker } from '@components/settings/PaymentMethodPicker'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { CreditCardIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type FormValues = { paymentInfo: { methods: PaymentMethod[] } }

const DEFAULT: FormValues['paymentInfo'] = { methods: ['cash'] }

export const ConsumerPaymentsClient = () => {
  const t = useTranslations('Settings')
  const [form] = Form.useForm<FormValues>()
  const [saved, setSaved] = useState<FormValues['paymentInfo']>(DEFAULT)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getConsumerProfileAPI()
      .then((profile) => {
        // Methods only — a row written when this tab still collected a reference
        // and notes must not re-surface those fields, and the next save drops them.
        const info = { methods: toPaymentMethods(profile.details.paymentInfo) }
        const next = info.methods.length ? info : DEFAULT
        setSaved(next)
        form.setFieldsValue({ paymentInfo: next })
      })
      .catch((err) => setError(processError(err).message))
  }, [form])

  const handleSave = async () => {
    const values = await form.validateFields()
    const paymentInfo = { methods: toPaymentMethods(values.paymentInfo) }
    setSaving(true)
    setError(null)
    try {
      await putConsumerProfileAPI({ paymentInfo })
      setSaved(paymentInfo)
      form.setFieldsValue({ paymentInfo })
      setDirty(false)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.payments')} subtitle={t('payments.subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-6'>
        <h2 className='text-h3 flex items-center gap-2 font-bold'>
          <CreditCardIcon className='text-brand h-5 w-5' />
          {t('payments.title')}
        </h2>

        <Form form={form} layout='vertical' onValuesChange={() => setDirty(true)} initialValues={{ paymentInfo: saved }}>
          <div className='flex flex-col gap-1.5'>
            <FieldLabel htmlFor='consumer-payment-methods'>{t('payments.methodsLabel')}</FieldLabel>
            <AppFormItem
              name={['paymentInfo', 'methods']}
              hasFeedback={false}
              messageVariables={{ label: t('payments.methodsLabel') }}
            >
              <PaymentMethodPicker htmlId='consumer-payment-methods' />
            </AppFormItem>
          </div>
        </Form>
      </Surface>

      <SettingsActionBar
        dirty={dirty}
        saving={saving}
        onDiscard={() => {
          form.setFieldsValue({ paymentInfo: saved })
          setDirty(false)
        }}
        onSave={() => void handleSave()}
        saveLabel={t('actions.save')}
        discardLabel={t('actions.discard')}
      />
    </div>
  )
}
