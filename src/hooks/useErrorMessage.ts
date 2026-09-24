'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SHOW_ERROR_DETAILS } from '@constants/errors'
import {
  buildErrorDetails,
  ClassifiedError,
  classifyError,
  ErrorCopyOverrides,
  ErrorDetails,
  resolveErrorText,
} from '@helpers/error'

export type DescribedError = {
  /** Friendly, translated copy — the only text a production visitor sees. */
  text: string
  classified: ClassifiedError
  /** The original error. Present in development only. */
  details?: ErrorDetails
}

export type DescribeError = (error: unknown, overrides?: ErrorCopyOverrides) => DescribedError

/**
 * Turns any error into what a person should read, plus — in development only — what the
 * original error actually said. Every error surface goes through this, which is what keeps
 * the server's English, developer-facing messages out of production.
 */
export const useErrorMessage = (): DescribeError => {
  const t = useTranslations('Errors')

  return useCallback<DescribeError>(
    (error, overrides) => {
      const classified = classifyError(error)
      return {
        text: resolveErrorText(classified, (key) => t(key), overrides),
        classified,
        details: SHOW_ERROR_DETAILS ? buildErrorDetails(classified) : undefined,
      }
    },
    [t]
  )
}
