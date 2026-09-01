'use client'

import { FC } from 'react'
import { Result } from 'antd'
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

export const ErrorState: FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'We could not load this page. Please try again.',
  digest,
  onRetry,
}) => (
  <Result
    status='error'
    title={title}
    subTitle={
      <span className='flex flex-col gap-1'>
        <span>{description}</span>
        {digest && <span className='text-caption text-brand-muted'>Reference: {digest}</span>}
      </span>
    }
    extra={[
      onRetry ? (
        <AppButton key='retry' type='primary' onClick={onRetry}>
          Try again
        </AppButton>
      ) : null,
      <AppLink key='home' href={ROUTES.home} variant='button'>
        Go home
      </AppLink>,
    ].filter(Boolean)}
  />
)
