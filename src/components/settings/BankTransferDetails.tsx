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
  payToNumber?: string
  notes?: string
  /** Booking sheet names the block; the public profile already has a Payments heading. */
  showHeading?: boolean
}

type CopyableRowProps = {
  label: string
  copyLabel: string
  value: string
}

const CopyableRow: FC<CopyableRowProps> = ({ label, copyLabel, value }) => {
  const tCopied = useTranslations('Settings.payments')
  const tCommon = useTranslations('Common')
  const { message } = App.useApp()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      message.success(tCopied('copied'))
    } catch {
      message.error(tCommon('copyFailed'))
    }
  }

  return (
    <div className='flex min-w-0 flex-col gap-0.5'>
      <div className='flex min-w-0 items-center gap-0.5'>
        <AppText size='caption' tone='muted' className='font-bold uppercase'>
          {label}
        </AppText>
        <AppButton
          type='text'
          shape='circle'
          size='small'
          icon={<CopyIcon className='h-4 w-4' />}
          aria-label={copyLabel}
          onClick={() => void copy()}
        />
      </div>
      <AppParagraph className='m-0 truncate font-semibold tnum' tone='default'>
        {value}
      </AppParagraph>
    </div>
  )
}

/**
 * Copyable pay-to details. Shown on the public profile, in settings as a preview,
 * and under the booking picker once the visitor includes bank transfer.
 */
export const BankTransferDetails: FC<Props> = ({ payToNumber, notes, showHeading = true }) => {
  const t = useTranslations('Booking')
  const tPayments = useTranslations('Settings.payments')

  if (!payToNumber && !notes) return null

  return (
    <div className='bg-surface-sunken border-brand-border flex flex-col gap-3 rounded-brand border p-3'>
      {showHeading ? (
        <AppTitle level='h3' size='body'>
          {t('paymentDetails')}
        </AppTitle>
      ) : null}
      {notes ? (
        <AppParagraph size='body-sm' className='m-0' tone='default'>
          {notes}
        </AppParagraph>
      ) : null}
      {payToNumber ? (
        <CopyableRow
          label={tPayments('cardOrAccountNumber')}
          copyLabel={tPayments('copyCardOrAccountNumber')}
          value={payToNumber}
        />
      ) : null}
    </div>
  )
}
