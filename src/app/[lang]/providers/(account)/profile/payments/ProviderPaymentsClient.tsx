'use client'

import { useEffect, useMemo, useState } from 'react'
import { Form } from 'antd'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { PaymentInfo } from '@interfaces/settings'
import { isFormValidationError } from '@helpers/error'
import { needsPublicShareConfirm, toPaymentMethods, toPaymentShare } from '@helpers/payment'
import { toOptionalText } from '@helpers/registration'
import { PaymentInfoFields } from '@components/settings/PaymentInfoFields'
import { SettingsActionBar, type SettingsPendingAction } from '@components/settings/SettingsActionBar'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
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
  const tErrors = useTranslations('Errors')
  const [form] = Form.useForm<FormValues>()
  const [saved, setSaved] = useState<PaymentInfo>(DEFAULT)
  const [dirty, setDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<SettingsPendingAction | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)
  const [pendingMode, setPendingMode] = useState<PersistMode | null>(null)

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false
    void getProviderProfileAPI()
      .then((profile) => {
        if (cancelled) return
        const info = readPaymentInfo(profile)
        setSaved(info)
        form.setFieldsValue({ paymentInfo: info })
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

  const persist = async (mode: PersistMode) => {
    const values = await form.validateFields()
    setPendingAction(mode)
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
      setPendingAction(null)
    }
  }

  const requestPersist = async (mode: PersistMode) => {
    try {
      const values = await form.validateFields()
      if (needsPublicShareConfirm(saved, values.paymentInfo)) {
        setPendingMode(mode)
        return
      }
      await persist(mode)
    } catch (err) {
      // A field that failed its rules is already marked under that field.
      if (!isFormValidationError(err)) setError(err)
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

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.payments')} subtitle={t('payments.subtitleGetPaid')} />
      {error !== null && <ErrorAlert error={error} />}

      <Surface className='flex flex-col gap-6'>
        <div className='flex flex-col gap-1.5'>
          <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
            <CreditCardIcon className='text-brand h-5 w-5' />
            {t('payments.title')}
          </AppTitle>
          <AppParagraph size='body-sm'>{t('payments.hint')}</AppParagraph>
        </div>

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
            disabled={pendingAction !== null}
            onValuesChange={() => setDirty(true)}
            initialValues={{ paymentInfo: saved }}
          >
            <PaymentInfoFields disabled={pendingAction !== null} />
          </Form>
        )}
      </Surface>

      {/* No Save over settings that never loaded: it would write the empty defaults. */}
      {loadError === null && (
        <SettingsActionBar
          dirty={dirty}
          pendingAction={pendingAction}
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
      )}

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
