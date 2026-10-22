'use client'

import { FC } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { PaymentMethodPicker } from '@components/settings/PaymentMethodPicker'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'

/**
 * The Payments tab's methods and note. The card or account number is never drafted — it is
 * kept as the provider saved it, and edited only on the tab, behind its publish confirmation.
 */
export const PaymentsStep: FC = () => {
  const t = useTranslations('Settings')
  const notesRules = useFormItemRules('maxCharsForTextarea')

  return (
    <div className='flex flex-col gap-4'>
      <AppParagraph size='body-sm' className='m-0'>
        {t('payments.subtitleGetPaid')}
      </AppParagraph>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='assistant-payment-methods'>{t('payments.methodsLabel')}</FieldLabel>
        <AppFormItem name='paymentMethods' className='m-0'>
          <PaymentMethodPicker htmlId='assistant-payment-methods' />
        </AppFormItem>
      </div>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='assistant-payment-notes' requirement='Optional'>
          {t('payments.notes')}
        </FieldLabel>
        <AppFormItem name='paymentNotes' rules={notesRules} messageVariables={{ label: t('payments.notes') }}>
          <AppTextArea
            id='assistant-payment-notes'
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={MAX_CHARS_FOR_TEXTAREA}
            placeholder={t('payments.notesPlaceholder')}
          />
        </AppFormItem>
      </div>
      <AppParagraph size='caption' tone='muted' className='m-0'>
        {t('assistant.payToKept')}
      </AppParagraph>
    </div>
  )
}
