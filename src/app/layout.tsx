import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { Metadata } from 'next'
import App from '@components/App'
import '@styles/antd-override.css'
import '@styles/commons.css'
import '@styles/globals.css'

export const metadata: Metadata = {
  title: 'Bookie',
  description: 'Your Booking Platform Forever',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <App>{children}</App>
        </AntdRegistry>
      </body>
    </html>
  )
}
