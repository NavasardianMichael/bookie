'use client'

import { FC, PropsWithChildren } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import { antdTheme } from '@styles/theme'
import { BreakpointInvariant } from './dev/BreakpointInvariant'
import { Header } from './header/Header'
import SkipLink from './layout/SkipLink'

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
const App: FC<PropsWithChildren> = ({ children }) => (
  <ConfigProvider theme={antdTheme}>
    {/* component={false} renders context only — no wrapper element to interfere
        with layout — while still enabling App.useApp() for message/modal. */}
    <AntApp component={false}>
      <SkipLink />
      <div className='flex min-h-dvh flex-col'>
        <Header />
        <main id='main' className='flex-1 app-safe-b'>
          {children}
        </main>
      </div>
      {process.env.NODE_ENV !== 'production' && <BreakpointInvariant />}
    </AntApp>
  </ConfigProvider>
)

export default App
