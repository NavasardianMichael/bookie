'use client'

import { FC } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Input, Select } from 'antd'
import { useTranslations } from 'next-intl'
import { PAYMENT_METHODS } from '@constants/settings'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'

const { TextArea } = Input

type Props = {
  /** Prefix for nested form names, e.g. nothing or under a parent. */
  disabled?: boolean
}

/**
 * Preferred in-person payment method + optional copyable reference. Never a card PAN.
 */
export const PaymentInfoFields: FC<Props> = ({ disabled }) => {
  const t = useTranslations('Settings.payments')

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='payment-method'>{t('method')}</FieldLabel>
        <AppFormItem name={['paymentInfo', 'method']} messageVariables={{ label: t('method') }}>
          <Select
            id='payment-method'
            disabled={disabled}
            options={PAYMENT_METHODS.map((method) => ({
              value: method,
              label: t(`methods.${method}`),
            }))}
          />
        </AppFormItem>
      </div>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='payment-reference' requirement='Optional'>
          {t('reference')}
        </FieldLabel>
        <AppFormItem name={['paymentInfo', 'reference']} messageVariables={{ label: t('reference') }}>
          <AppInput id='payment-reference' disabled={disabled} placeholder={t('referencePlaceholder')} />
        </AppFormItem>
      </div>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='payment-notes' requirement='Optional'>
          {t('notes')}
        </FieldLabel>
        <AppFormItem name={['paymentInfo', 'notes']} messageVariables={{ label: t('notes') }}>
          <TextArea id='payment-notes' rows={3} disabled={disabled} placeholder={t('notesPlaceholder')} />
        </AppFormItem>
      </div>
    </div>
  )
}
