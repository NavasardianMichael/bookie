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
    colorLink: '#18294D',
  },
  components: {
    Typography: {
      margin: 0,
    },
  },
}

const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider theme={themeConfig}>
      <div className='min-h-svh flex flex-col h-dvh'>
        <Header />
        <div className='w-full h-full d-block grow overflow-auto scroll-smooth'>
          <main className='h-full grow p-4 overflow-auto scroll-smooth'>{children}</main>
          {/* <Footer /> */}
        </div>
      </div>
    </ConfigProvider>
  )
}

export default App
