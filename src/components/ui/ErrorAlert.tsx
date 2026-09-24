'use client'

import { FC, ReactNode } from 'react'
import { Alert } from 'antd'
import { useTranslations } from 'next-intl'
import { useErrorMessage } from '@hooks/useErrorMessage'
import { ErrorCopyOverrides } from '@helpers/error'
import { AppButton } from './AppButton'
import { ErrorDetails } from './bare/ErrorDetails'

export type ErrorAlertProps = {
  error: unknown
  /**
   * What failed, when the block needs saying ("We could not load the calendar"). The
   * error's own copy then becomes the description. Without it, the error's copy is the title.
   */
  title?: string
  /** Copy for a specific code or kind, when the call site knows better than the default. */
  overrides?: ErrorCopyOverrides
  /** Re-runs what failed. Offered only when the error is one a retry can fix. */
  onRetry?: () => void
  retrying?: boolean
  /** An action of the call site's own — sign-in's "resend link", booking's "choose another time". */
  action?: ReactNode
  /** `warning` for a partial failure the rest of the screen still works around. */
  tone?: 'error' | 'warning'
  className?: string
}

/**
 * The one inline error block. Friendly copy always; the original error underneath in
 * development; Retry when retrying can help, Reload when the build under the page changed.
 */
export const ErrorAlert: FC<ErrorAlertProps> = ({
  error,
  title,
  overrides,
  onRetry,
  retrying,
  action,
  tone = 'error',
  className,
}) => {
  const t = useTranslations('Errors')
  const tCommon = useTranslations('Common')
  const describe = useErrorMessage()
  const { text, classified, details } = describe(error, overrides)

  const actions = [
    action,
    onRetry && classified.retryable ? (
      <AppButton key='retry' size='small' onClick={onRetry} loading={retrying}>
        {tCommon('tryAgain')}
      </AppButton>
    ) : null,
    classified.kind === 'staleBuild' ? (
      <AppButton key='reload' size='small' onClick={() => window.location.reload()}>
        {tCommon('reload')}
      </AppButton>
    ) : null,
  ].filter(Boolean)

  const description =
    title || details ? (
      <div className='flex flex-col gap-2'>
        {title ? <span>{text}</span> : null}
        {details ? <ErrorDetails details={details} label={t('devDetails')} /> : null}
      </div>
    ) : undefined

  return (
    <Alert
      type={tone}
      showIcon
      title={title ?? text}
      description={description}
      action={actions.length ? <div className='flex flex-wrap gap-2'>{actions}</div> : undefined}
      className={className}
    />
  )
}
