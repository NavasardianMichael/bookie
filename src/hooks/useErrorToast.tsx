'use client'

import { useCallback } from 'react'
import { App } from 'antd'
import { useTranslations } from 'next-intl'
import { useErrorMessage } from '@hooks/useErrorMessage'
import { ErrorCopyOverrides } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { ErrorDetails } from '@components/ui/bare/ErrorDetails'

export type ErrorToastOptions = {
  /** What failed. The error's own copy then becomes the description. */
  title?: string
  overrides?: ErrorCopyOverrides
  /** Re-runs what failed. Offered only when the error is one a retry can fix. */
  onRetry?: () => void
  /** Collapses repeats: a second toast with the same key replaces the first. */
  key?: string
}

let toastSequence = 0

/**
 * A failure with nowhere inline to live — a toggle, a delete, a background refresh.
 * Same copy and dev details as `ErrorAlert`, through antd's notification.
 */
export const useErrorToast = (): ((error: unknown, options?: ErrorToastOptions) => void) => {
  const { notification } = App.useApp()
  const t = useTranslations('Errors')
  const tCommon = useTranslations('Common')
  const describe = useErrorMessage()

  return useCallback(
    (error, options = {}) => {
      const { text, classified, details } = describe(error, options.overrides)
      const key = options.key ?? `error-toast-${++toastSequence}`
      const { onRetry } = options

      const actions =
        onRetry && classified.retryable ? (
          <AppButton
            size='small'
            type='primary'
            onClick={() => {
              notification.destroy(key)
              onRetry()
            }}
          >
            {tCommon('tryAgain')}
          </AppButton>
        ) : classified.kind === 'staleBuild' ? (
          <AppButton size='small' type='primary' onClick={() => window.location.reload()}>
            {tCommon('reload')}
          </AppButton>
        ) : undefined

      notification.error({
        key,
        title: options.title ?? text,
        description:
          options.title || details ? (
            <div className='flex flex-col gap-2'>
              {options.title ? <span>{text}</span> : null}
              {details ? <ErrorDetails details={details} label={t('devDetails')} /> : null}
            </div>
          ) : undefined,
        actions,
      })
    },
    [describe, notification, t, tCommon]
  )
}
