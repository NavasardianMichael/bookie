'use client'

import { FC } from 'react'
import { Result } from 'antd'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import { AppButton } from './AppButton'
import { AppLink } from './bare/AppLink'

export type ErrorStateProps = {
  title?: string
  description?: string
  /** Next.js error digest, useful when a user reports a failure. */
  digest?: string
  onRetry?: () => void
}

export const ErrorState: FC<ErrorStateProps> = ({ title, description, digest, onRetry }) => {
  const t = useTranslations('Errors')
  const tCommon = useTranslations('Common')

  return (
    <Result
      status='error'
      title={title ?? t('title')}
      subTitle={
        <span className='flex flex-col gap-1'>
          <span>{description ?? t('body')}</span>
          {digest && <span className='text-caption text-brand-muted'>{t('reference', { digest })}</span>}
        </span>
      }
      extra={[
        onRetry ? (
          <AppButton key='retry' type='primary' onClick={onRetry}>
            {tCommon('tryAgain')}
          </AppButton>
        ) : null,
        <AppLink key='home' href={ROUTES.home} variant='button'>
          {tCommon('goHome')}
        </AppLink>,
      ].filter(Boolean)}
    />
  )
}
