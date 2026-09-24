'use client'

import { useEffect, useState } from 'react'
import { Direction, getDirection, Locale } from '@i18n/config'
import { splitLocaleFromPathname } from '@i18n/pathname'
import { SHOW_ERROR_DETAILS } from '@constants/errors'
import { buildErrorDetails, classifyError, formatErrorDetails } from '@helpers/error'
import { reportError } from '@helpers/reportError'
import type { RouteErrorProps } from '@components/errors/RouteErrorFallback'
import { BRAND, NEUTRAL } from '@styles/tokens'

type Copy = { title: string; body: string; tryAgain: string; reload: string; reference: string; details: string }

/**
 * Only for when the reader's catalogue cannot load — which is exactly what happens when
 * the failure *is* a chunk load. Every other render swaps in the translated copy.
 */
const FALLBACK_COPY: Copy = {
  title: 'Something went wrong',
  body: 'Bookie hit an unexpected error and could not recover. Please try again.',
  tryAgain: 'Try again',
  reload: 'Reload page',
  reference: 'Reference: {digest}',
  details: 'Developer details',
}

const buttonStyle = {
  minHeight: '2.75rem',
  padding: '0 1.25rem',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
} as const

/**
 * Renders outside the root layout, so it has its own <html>/<body> and cannot use
 * antd or next-intl — there is no ConfigProvider, AntdRegistry or message provider above
 * it. Styles are inline for the same reason: the stylesheet may be what failed.
 *
 * The locale comes off the URL, since there is no `[lang]` param up here, and its
 * catalogue is imported on the client. This page is prerendered, so both happen in an
 * effect: reading `window` during render would mismatch the prerendered HTML.
 */
export default function GlobalError({ error, retry }: RouteErrorProps) {
  const [copy, setCopy] = useState<Copy>(FALLBACK_COPY)
  const [locale, setLocale] = useState<Locale | null>(null)
  const direction: Direction = locale ? getDirection(locale) : 'ltr'
  const isStaleBuild = classifyError(error).kind === 'staleBuild'

  useEffect(() => {
    reportError(error, 'global-error')
  }, [error])

  useEffect(() => {
    const { locale: urlLocale } = splitLocaleFromPathname(window.location.pathname)
    if (!urlLocale) return
    let cancelled = false
    import(`../messages/${urlLocale}.json`)
      .then(({ default: messages }) => {
        if (cancelled) return
        setLocale(urlLocale)
        setCopy({
          title: messages.Errors.title,
          body: isStaleBuild ? messages.Errors.kinds.staleBuild : messages.Errors.body,
          tryAgain: messages.Common.tryAgain,
          reload: messages.Common.reload,
          reference: messages.Errors.reference,
          details: messages.Errors.devDetails,
        })
      })
      // The fallback copy is already on screen; there is nothing better to show.
      .catch((catalogueError: unknown) => reportError(catalogueError, 'global-error:catalogue'))
    return () => {
      cancelled = true
    }
  }, [isStaleBuild])

  return (
    <html lang={locale ?? 'en'} dir={direction}>
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: NEUTRAL[0],
          color: BRAND[900],
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '32rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{copy.title}</h1>
          <p style={{ margin: 0, color: NEUTRAL[600] }}>{copy.body}</p>
          {error.digest && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: NEUTRAL[500] }}>
              {copy.reference.replace('{digest}', error.digest)}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            {!isStaleBuild && (
              <button
                onClick={retry}
                style={{ ...buttonStyle, border: 'none', background: BRAND[900], color: NEUTRAL[0] }}
              >
                {copy.tryAgain}
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                ...buttonStyle,
                border: `1px solid ${isStaleBuild ? BRAND[900] : NEUTRAL[300]}`,
                background: isStaleBuild ? BRAND[900] : NEUTRAL[0],
                color: isStaleBuild ? NEUTRAL[0] : BRAND[900],
              }}
            >
              {copy.reload}
            </button>
          </div>
          {SHOW_ERROR_DETAILS && (
            <details style={{ marginTop: '1rem', fontSize: '0.8125rem', color: NEUTRAL[600], textAlign: 'start' }}>
              <summary style={{ cursor: 'pointer' }}>{copy.details}</summary>
              <pre
                style={{
                  margin: '0.5rem 0 0',
                  maxHeight: '15rem',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  background: NEUTRAL[100],
                }}
              >
                {formatErrorDetails(buildErrorDetails(classifyError(error)))}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  )
}
