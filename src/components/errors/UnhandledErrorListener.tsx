'use client'

import { FC, useEffect } from 'react'
import { isAxiosError } from 'axios'
import { useErrorToast } from '@hooks/useErrorToast'
import { SHOW_ERROR_DETAILS } from '@constants/errors'
import { classifyError } from '@helpers/error'
import { reportError } from '@helpers/reportError'

/**
 * The safety net under every other error surface: a promise nobody awaited, or a
 * script that could not load after a deploy.
 *
 * Only what a visitor can act on reaches them. In production that is a failed API call
 * (the page did not do what they asked, and they should know) and a stale build (a reload
 * fixes it). Any other stray rejection is reported but not shown — in production it is
 * as likely to be an extension or an analytics script as ours. Development shows all of
 * them, alongside Next's own overlay.
 *
 * Repeats collapse onto one toast per kind, so a failing poll cannot stack them.
 */
export const UnhandledErrorListener: FC = () => {
  const toast = useErrorToast()

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, 'unhandledrejection')
      const { kind } = classifyError(event.reason)
      if (SHOW_ERROR_DETAILS || isAxiosError(event.reason) || kind === 'staleBuild') {
        toast(event.reason, { key: `unhandled-${kind}` })
      }
    }

    const onError = (event: ErrorEvent) => {
      // A cross-origin script (an extension, a third-party tag) reports "Script error."
      // with no filename or detail; it is not ours to explain.
      if (!event.filename?.startsWith(window.location.origin)) return
      const error = event.error ?? new Error(event.message)
      if (classifyError(error).kind === 'staleBuild') {
        reportError(error, 'window.error')
        toast(error, { key: 'unhandled-staleBuild' })
      }
    }

    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
    }
  }, [toast])

  return null
}
