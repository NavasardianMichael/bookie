'use client'

import { BRAND, NEUTRAL } from '@styles/tokens'

/**
 * Renders outside the root layout, so it has its own <html>/<body> and cannot use
 * antd — there is no ConfigProvider or AntdRegistry above it. Styles are inline
 * for the same reason: the stylesheet may be what failed.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang='en'>
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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Something went wrong</h1>
          <p style={{ margin: 0, color: NEUTRAL[600] }}>
            Bookie hit an unexpected error and could not recover. Please try again.
          </p>
          {error.digest && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: NEUTRAL[500] }}>Reference: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              alignSelf: 'center',
              marginTop: '0.5rem',
              minHeight: '2.75rem',
              padding: '0 1.25rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: BRAND[900],
              color: NEUTRAL[0],
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
