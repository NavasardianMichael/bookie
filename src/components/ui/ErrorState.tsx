'use client'

import { FC } from 'react'
import { Result } from 'antd'
import { useTranslations } from 'next-intl'
import { useErrorMessage } from '@hooks/useErrorMessage'
import { ROUTES } from '@constants/routes'
import { AppButton } from './AppButton'
import { AppLink } from './bare/AppLink'
import { ErrorDetails } from './bare/ErrorDetails'

export type ErrorStateProps = {
  title?: string
  /** What could not load. Production strips a Server Component error to a digest, so this is the useful sentence. */
  description?: string
  /** Next.js error digest, useful when a user reports a failure. */
  digest?: string
  /** The error itself — its original message is shown in development, never in production. */
  error?: unknown
  onRetry?: () => void
}

/**
 * The full-block failure: an error boundary's body, or a panel with nothing to show.
 *
 * Two kinds override the caller's copy, because they are about the visitor's situation
 * rather than the page: `offline` (their connection) and `staleBuild` (a deploy replaced
 * the page's code — only a reload helps, so Reload replaces Try again).
 */
export const ErrorState: FC<ErrorStateProps> = ({ title, description, digest, error, onRetry }) => {
  const t = useTranslations('Errors')
  const tCommon = useTranslations('Common')
  const describe = useErrorMessage()
  const described = error === undefined ? null : describe(error)
  const kind = described?.classified.kind
  const isStaleBuild = kind === 'staleBuild'

  const resolvedTitle = isStaleBuild ? t('newVersionTitle') : (title ?? t('title'))
  const resolvedDescription =
    (kind === 'offline' || isStaleBuild) && described ? described.text : (description ?? t('body'))

  return (
    <Result
      status={isStaleBuild ? 'info' : 'error'}
      title={resolvedTitle}
      subTitle={
        <span className='flex flex-col gap-1'>
          <span>{resolvedDescription}</span>
          {digest && <span className='text-caption text-brand-muted'>{t('reference', { digest })}</span>}
        </span>
      }
      extra={
        <div className='flex flex-col items-center gap-4'>
          <div className='flex flex-wrap justify-center gap-2'>
            {isStaleBuild ? (
              <AppButton type='primary' onClick={() => window.location.reload()}>
                {tCommon('reload')}
              </AppButton>
            ) : onRetry ? (
              <AppButton type='primary' onClick={onRetry}>
                {tCommon('tryAgain')}
              </AppButton>
            ) : null}
            <AppLink href={ROUTES.home} variant='button'>
              {tCommon('goHome')}
            </AppLink>
          </div>
          {described?.details ? (
            <ErrorDetails details={described.details} label={t('devDetails')} className='w-full max-w-prose' />
          ) : null}
        </div>
      }
    />
  )
}
