'use client'

import { PropsWithChildren } from 'react'
import { ConfigProvider, ThemeConfig } from 'antd'
import { StoreProvider } from '@store/Provider'

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#4D869C', // Clay/tan
    colorBgBase: '#EEF7FF', // Soft off-white
  },
}

export default function Template({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={themeConfig}>
      <StoreProvider>{children}</StoreProvider>
    </ConfigProvider>
  )
}
