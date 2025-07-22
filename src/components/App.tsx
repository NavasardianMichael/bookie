'use client'

import { FC, PropsWithChildren } from 'react'
import { ConfigProvider, ThemeConfig } from 'antd'
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
        <div className='w-full d-block flex-grow flex flex-col overflow-auto'>
          <main className='h-full flex-grow p-4'>{children}</main>
          {/* <Footer /> */}
        </div>
      </div>
    </ConfigProvider>
  )
}

export default App
