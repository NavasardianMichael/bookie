import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { Metadata } from 'next'
import App from '@components/App'
import '@styles/antd-override.css'
import '@styles/commons.css'
import '@styles/globals.css'

export const metadata: Metadata = {
  title: 'Bookie',
  description: 'Your Booking Platform Forever',
  authors: [
    {
      name: 'Michael Navasardyan',
      url: 'https://www.linkedin.com/in/michael-navasardyan/',
    },
  ],
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
