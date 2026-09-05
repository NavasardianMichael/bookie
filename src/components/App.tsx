'use client'

import { FC, PropsWithChildren } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import type { Locale as AntdLocale } from 'antd/es/locale'
import type { Direction, Locale } from '@i18n/config'
import { setDayjsLocale } from '@i18n/dayjs'
import { antdTheme } from '@styles/theme'
import { BreakpointInvariant } from './dev/BreakpointInvariant'
import { Header } from './header/Header'
import { Footer } from './layout/Footer'
import { SkipLink } from './layout/SkipLink'

/**
 * A single document-level scroller.
 *
 * The previous shell was `h-dvh` with two nested `overflow-auto` wrappers, which
 * cost a second scrollbar on tall pages, iOS momentum scrolling, URL-bar
 * collapse, and scroll restoration — and made `position: sticky` impossible,
 * since a sticky element sticks to its nearest scrollport.
 *
 * `<main>` deliberately carries no container: each page picks its own width via
 * PageShell, so an auth form can stay narrow while a card grid goes wide.
 */
export type AppProps = PropsWithChildren<{
  /** antd's own component copy, resolved on the server — see `@i18n/antdLocale`. */
  antdLocale: AntdLocale
  direction: Direction
  locale: Locale
}>

export const App: FC<AppProps> = ({ antdLocale, children, direction, locale }) => {
  // dayjs's locale is a module global, so it is set here — on the client, where
  // there is exactly one — rather than on the server, where concurrent requests
  // in different languages would race. antd's pickers read month and weekday
  // names off dayjs, not off `antdLocale`.
  setDayjsLocale(locale)

  return (
    <ConfigProvider direction={direction} locale={antdLocale} theme={antdTheme}>
      {/* component={false} renders context only — no wrapper element to interfere
          with layout — while still enabling App.useApp() for message/modal. */}
      <AntApp component={false}>
        <SkipLink />
        <div className='flex min-h-dvh flex-col'>
          <Header />
          <main id='main' className='flex-1 app-safe-b'>
            {children}
          </main>
          <Footer />
        </div>
        {process.env.NODE_ENV !== 'production' && <BreakpointInvariant />}
      </AntApp>
    </ConfigProvider>
  )
}
