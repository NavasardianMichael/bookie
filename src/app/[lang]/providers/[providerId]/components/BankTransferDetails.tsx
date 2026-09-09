'use client'

import { FC } from 'react'
import { App } from 'antd'
import { useTranslations } from 'next-intl'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CopyIcon } from '@components/ui/icons'

type Props = {
  reference?: string
  notes?: string
}

/**
 * Shown under the payment picker once the visitor includes bank transfer.
 * `reference` is the provider's copyable account / card number — the app never stores a PAN.
 */
export const BankTransferDetails: FC<Props> = ({ reference, notes }) => {
  const t = useTranslations('Booking')
  const tCopied = useTranslations('Settings.payments')
  const tCommon = useTranslations('Common')
  const { message } = App.useApp()

  if (!reference && !notes) return null

  const copyReference = async () => {
    if (!reference) return
    try {
      await navigator.clipboard.writeText(reference)
      message.success(tCopied('copied'))
    } catch {
      message.error(tCommon('copyFailed'))
    }
  }

  return (
    <div className='bg-surface-sunken border-brand-border flex flex-col gap-3 rounded-brand border p-3'>
      <AppTitle level='h3' size='body'>
        {t('paymentDetails')}
      </AppTitle>
      {notes ? (
        <AppParagraph size='body-sm' className='m-0' tone='default'>
          {notes}
        </AppParagraph>
      ) : null}
      {reference ? (
        <div className='flex min-w-0 items-center gap-2'>
          <div className='min-w-0 flex-1'>
            <AppText size='caption' tone='muted' className='font-bold uppercase'>
              {t('paymentCardNumber')}
            </AppText>
            <AppParagraph className='m-0 truncate font-semibold tnum' tone='default'>
              {reference}
            </AppParagraph>
          </div>
          <AppButton
            type='text'
            shape='circle'
            icon={<CopyIcon className='h-4 w-4' />}
            aria-label={t('copyCardNumber')}
            onClick={() => void copyReference()}
          />
        </div>
      ) : null}
    </div>
  )
}
