import Footer from '@components/Footer'
import { Header } from '@components/Header'
import type { Metadata } from 'next'
import '@styles/globals.css'
import '@styles/antd-override.css'
import '@styles/commons.css'
import { AntdRegistry } from '@ant-design/nextjs-registry'

export const metadata: Metadata = {
  title: 'Bookie',
  description: 'Your Booking Platform Forever',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <div className="min-h-svh flex flex-col h-dvh">
            <Header />
            <div className='flex-grow flex flex-col overflow-auto'>
              <main className="flex-grow p-4 flex items-start">{children}</main>
              <Footer />
            </div>
          </div>
        </AntdRegistry>
      </body>
    </html>
  )
}
