'use client'

import { ConfigProvider, ThemeConfig } from 'antd'
import { FC, PropsWithChildren } from 'react'
import { Header } from './header/Header'

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#18294D', // blue
    // colorBgBase: '#D2D2D2', // Soft off-white
    colorTextBase: '#18294D', // Dark blue for text
    colorTextSecondary: '#18294D',
  },
}

const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider theme={themeConfig}>
      <div className='min-h-svh flex flex-col h-dvh'>
        <Header />
        <div className='flex-grow flex flex-col overflow-auto'>
          <main className='flex-grow p-4 flex items-start'>{children}</main>
          {/* <Footer /> */}
        </div>
      </div>
    </ConfigProvider>
  )
}

export default App
