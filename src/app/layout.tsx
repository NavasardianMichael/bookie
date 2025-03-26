import Footer from '@components/Footer'
import { Header } from '@components/Header'
import type { Metadata } from 'next'
import './globals.css'


export const metadata: Metadata = {
  title: 'Bookie',
  description: 'Your Booking Platform Forever',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-svh flex flex-col">
          <Header />
          <div className='flex-grow flex flex-col'>
            <main className="flex-grow p-4 flex">{children}</main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
