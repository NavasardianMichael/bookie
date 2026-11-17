'use client'

import { FC } from 'react'
import { Alert } from 'antd'
import { useTranslations } from 'next-intl'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'
import { CheckCircleIcon } from '@components/ui/icons'

type Props = {
  email: string
  isResending: boolean
  resent: boolean
  onResend: () => void
}

/**
 * Sign-in with an unconfirmed address. Not an error — the account is fine, it has one step
 * left — so it reads as guidance in the `info` tone, and the resend link is its main action
 * rather than a side button squeezed beside a failure message.
 */
export const UnverifiedEmailNotice: FC<Props> = ({ email, isResending, resent, onResend }) => {
  const t = useTranslations('Auth.signIn')

  return (
    <Alert
      type='info'
      showIcon
      title={t('unverifiedTitle')}
      description={
        <div className='flex flex-col items-start gap-2'>
          <span>{t('unverifiedBody', { email })}</span>
          {resent ? (
            <AppText size='body-sm' className='inline-flex items-center gap-1 font-semibold' role='status'>
              <CheckCircleIcon className='h-4 w-4' />
              {t('verificationResent')}
            </AppText>
          ) : (
            <AppButton size='small' loading={isResending} onClick={onResend}>
              {t('resendVerification')}
            </AppButton>
          )}
        </div>
      }
    />
  )
}
