'use client'

import { useEffect, useState } from 'react'
import { Alert, Form } from 'antd'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { PaymentInfo } from '@interfaces/settings'
import { processError } from '@helpers/error'
import { acceptsBankTransfer, hasPaymentShare, needsPublicShareConfirm, toPaymentMethods, toPaymentShare } from '@helpers/payment'
import { toOptionalText } from '@helpers/registration'
import { BankTransferDetails } from '@components/settings/BankTransferDetails'
import { PaymentInfoFields } from '@components/settings/PaymentInfoFields'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { CreditCardIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type FormValues = { paymentInfo: PaymentInfo }
type PersistMode = 'draft' | 'publish'

const DEFAULT: PaymentInfo = { methods: ['cash'], payToNumber: '', notes: '' }

const toFormValues = (info: PaymentInfo): PaymentInfo => {
  const share = toPaymentShare(info)
  return {
    methods: toPaymentMethods(info),
    payToNumber: share.payToNumber ?? '',
    notes: share.notes ?? '',
  }
}

/**
 * Draft overlay wins over the live column, and both are normalised — a `draft`
 * written before the `method` -> `methods` reshape is JSON the migration's
 * `UPDATE` reshapes too, but a client holding a stale copy would still send one.
 */
const readPaymentInfo = (profile: {
  draft?: { paymentInfo?: unknown } | null
  details: { paymentInfo?: PaymentInfo }
}): PaymentInfo => {
  const stored = (profile.draft?.paymentInfo as PaymentInfo | undefined) ?? profile.details.paymentInfo
  return stored ? toFormValues(stored) : DEFAULT
}

const toPayload = (values: PaymentInfo): PaymentInfo => ({
  methods: toPaymentMethods(values),
  payToNumber: toOptionalText(values.payToNumber),
  notes: toOptionalText(values.notes),
})

export const ProviderPaymentsClient = () => {
  const t = useTranslations('Settings')
  const [form] = Form.useForm<FormValues>()
  const [saved, setSaved] = useState<PaymentInfo>(DEFAULT)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingMode, setPendingMode] = useState<PersistMode | null>(null)

  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => {
        const info = readPaymentInfo(profile)
        setSaved(info)
        form.setFieldsValue({ paymentInfo: info })
      })
      .catch((err) => setError(processError(err).message))
  }, [form])

  const persist = async (mode: PersistMode) => {
    const values = await form.validateFields()
    setSaving(true)
    setError(null)
    try {
      await putProviderProfileAPI({ mode: 'draft', paymentInfo: toPayload(values.paymentInfo) })
      if (mode === 'publish') {
        await putProviderProfileAPI({ mode: 'publish' })
      }
      const profile = await getProviderProfileAPI()
      const info = readPaymentInfo(profile)
      setSaved(info)
      form.setFieldsValue({ paymentInfo: info })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const requestPersist = async (mode: PersistMode) => {
    const values = await form.validateFields()
    if (needsPublicShareConfirm(saved, values.paymentInfo)) {
      setPendingMode(mode)
      return
    }
    try {
      await persist(mode)
    } catch (err) {
      setError(processError(err).message)
    }
  }

  /**
   * Deliberately unguarded: `AppConfirmModal` awaits this, surfaces a rejection,
   * and stays open — catching here would hide a failed save behind a closed dialog.
   */
  const handleConfirmShare = async () => {
    if (!pendingMode) return
    await persist(pendingMode)
    setPendingMode(null)
  }

  const payToNumber = Form.useWatch(['paymentInfo', 'payToNumber'], form)
  const notes = Form.useWatch(['paymentInfo', 'notes'], form)
  const methods = Form.useWatch(['paymentInfo', 'methods'], form)
  const preview = toPaymentShare({ methods: [], payToNumber, notes })
  const showTransferPreview = acceptsBankTransfer({ methods: methods ?? [] }) && hasPaymentShare(preview)

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

        {showTransferPreview ? <BankTransferDetails {...preview} showHeading={false} /> : null}
      </Surface>

      <SettingsActionBar
        dirty={dirty}
        saving={saving}
        onDiscard={() => {
          form.setFieldsValue({ paymentInfo: saved })
          setDirty(false)
        }}
        onSaveDraft={() => void requestPersist('draft')}
        onPublish={() => void requestPersist('publish')}
        saveDraftLabel={t('actions.saveDraft')}
        publishLabel={t('actions.publish')}
        discardLabel={t('actions.discard')}
      />

      <AppConfirmModal
        open={pendingMode !== null}
        title={t('payments.publicShareTitle')}
        description={t('payments.publicShareWarning')}
        onConfirm={handleConfirmShare}
        onCancel={() => setPendingMode(null)}
      />
    </div>
  )
}
