'use client'

import { FC } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Select } from 'antd'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { PAYMENT_METHODS } from '@constants/settings'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'

type Props = {
  /** Prefix for nested form names, e.g. nothing or under a parent. */
  disabled?: boolean
}

/**
 * Accepted in-person payment methods + optional copyable reference. Never a card PAN.
 */
export const PaymentInfoFields: FC<Props> = ({ disabled }) => {
  const t = useTranslations('Settings.payments')
  const notesRules = useFormItemRules('maxCharsForTextarea')

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='payment-methods'>{t('methodsLabel')}</FieldLabel>
        <AppFormItem name={['paymentInfo', 'methods']} messageVariables={{ label: t('methodsLabel') }}>
          <Select
            id='payment-methods'
            mode='multiple'
            disabled={disabled}
            placeholder={t('methodsPlaceholder')}
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
        <AppFormItem name={['paymentInfo', 'notes']} rules={notesRules} messageVariables={{ label: t('notes') }}>
          <AppTextArea
            id='payment-notes'
            rows={3}
            disabled={disabled}
            placeholder={t('notesPlaceholder')}
            maxLength={MAX_CHARS_FOR_TEXTAREA}
          />
        </AppFormItem>
      </div>
    </div>
  )
}
