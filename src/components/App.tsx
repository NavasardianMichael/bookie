'use client'

import React, { FC, PropsWithChildren } from 'react'
import { ConfigProvider, ThemeConfig } from 'antd'
import { StoreProvider } from '@store/Provider'
import Footer from './Footer'
import { Header } from './Header'

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#4D869C', // Clay/tan
    colorBgBase: '#EEF7FF', // Soft off-white
  },
}

const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider theme={themeConfig}>
      <StoreProvider>
        <div className="min-h-svh flex flex-col h-dvh">
          <Header />
          <div className="flex-grow flex flex-col overflow-auto">
            <main className="flex-grow p-4 flex items-start">{children}</main>
            <Footer />
          </div>
        </div>
      </StoreProvider>
    </ConfigProvider>
  )
}

export default App
