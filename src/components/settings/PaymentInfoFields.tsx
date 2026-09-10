'use client'

import { FC } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { App, Form } from 'antd'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { PaymentMethod } from '@interfaces/settings'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { cn } from '@helpers/cn'
import { PaymentMethodPicker } from '@components/settings/PaymentMethodPicker'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { CopyIcon } from '@components/ui/icons'

type Props = {
  /** Prefix for nested form names, e.g. nothing or under a parent. */
  disabled?: boolean
}

/** Wider than `maxCharsForInput` (40) so an IBAN with spaces still fits. */
const PAYMENT_SHARE_MAX = 80

/**
 * Accepted in-person methods plus the copyable pay-to details a provider publishes.
 * The number belongs to bank transfer, so it stays mounted (antd would drop its
 * value if the item unmounted) and is only shown when that method is on.
 * Saving a new number is confirmed in a dialog, not inline.
 */
export const PaymentInfoFields: FC<Props> = ({ disabled }) => {
  const t = useTranslations('Settings.payments')
  const tCommon = useTranslations('Common')
  const { message } = App.useApp()
  const notesRules = useFormItemRules('maxCharsForTextarea')
  const methods = Form.useWatch(['paymentInfo', 'methods']) as PaymentMethod[] | undefined
  const payToNumber = Form.useWatch(['paymentInfo', 'payToNumber'])
  const showTransferFields = (methods ?? []).includes('bank_transfer')
  const copyText = typeof payToNumber === 'string' ? payToNumber : ''

  const copyPayToNumber = async () => {
    if (!copyText.trim()) return
    try {
      await navigator.clipboard.writeText(copyText)
      message.success(t('copied'))
    } catch {
      message.error(tCommon('copyFailed'))
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='payment-methods'>{t('methodsLabel')}</FieldLabel>
        <AppFormItem
          name={['paymentInfo', 'methods']}
          hasFeedback={false}
          messageVariables={{ label: t('methodsLabel') }}
        >
          <PaymentMethodPicker htmlId='payment-methods' disabled={disabled} />
        </AppFormItem>
      </div>

      <div className={cn('flex flex-col gap-1.5', !showTransferFields && 'hidden')}>
        <FieldLabel
          htmlFor='payment-pay-to-number'
          requirement='Optional'
          action={
            <AppButton
              type='text'
              shape='circle'
              size='small'
              icon={<CopyIcon className='h-4 w-4' />}
              aria-label={t('copyCardOrAccountNumber')}
              disabled={disabled || !copyText.trim()}
              onClick={() => void copyPayToNumber()}
            />
          }
        >
          {t('cardOrAccountNumber')}
        </FieldLabel>
        <AppFormItem
          name={['paymentInfo', 'payToNumber']}
          hasFeedback={false}
          messageVariables={{ label: t('cardOrAccountNumber') }}
        >
          <AppInput
            id='payment-pay-to-number'
            disabled={disabled}
            placeholder={t('cardOrAccountNumberPlaceholder')}
            maxLength={PAYMENT_SHARE_MAX}
            autoComplete='off'
            spellCheck={false}
          />
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
