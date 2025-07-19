import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { Metadata } from 'next'
import App from '@components/App'
import '@styles/antd-override.css'
import '@styles/commons.css'
import '@styles/globals.css'

export const metadata: Metadata = {
  title: 'Bookie',
  description: 'Your Booking Platform Forever',
  // TODO: add manifest and appropriate assets
  // manifest: '/manifest.webmanifest',
  keywords: 'Bookie, booking, appointments, calendar, schedule',
  robots: 'index, follow',
  applicationName: 'Bookie',
  alternates: {
    canonical: 'https://bookie-sigma.vercel.app/',
  },
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    url: 'https://hangman-ai-ivory.vercel.app/',
    type: 'website',
    title: 'Bookie',
    description:
      'Bookie is a booking platform that allows users to schedule appointments with service providers easily.',
    siteName: 'Bookie',
    images: [
      {
        url: '/logo.svg',
        alt: 'Bookie - Your Booking Platform Forever',
      },
    ],
  },
  creator: 'Michael Navasardyan',
  authors: [
    {
      name: 'Michael Navasardyan',
      url: 'https://www.linkedin.com/in/michael-navasardyan/',
    },
  ],
  category: 'Online Booking Platform',
  // verification: {
  //   google: 'otJjduk66KdJqUVQWUMGb3RCg7U5NGhdFLCDpcjP5_U',
  // },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en'>
      <body>
        <AntdRegistry>
          <App>{children}</App>
        </AntdRegistry>
      </body>
    </html>
  )
}
