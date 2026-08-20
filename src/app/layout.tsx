import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { Metadata, Viewport } from 'next'
import App from '@components/App'
import '@styles/antd-override.css'
import '@styles/globals.css'
import { fontSans } from '@styles/fonts'
import { BRAND } from '@styles/tokens'

/**
 * Without this export, mobile browsers render at ~980px and scale the desktop
 * layout down, which makes every responsive style in the app invisible.
 *
 * - `viewportFit: 'cover'` is required for `env(safe-area-inset-*)` to be non-zero.
 * - `interactiveWidget: 'resizes-content'` shrinks the layout viewport when the
 *   Android soft keyboard opens, so sticky form actions stay above it.
 * - No `maximumScale`/`userScalable`: pinch-zoom must stay available.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: BRAND[900],
  colorScheme: 'light',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://bookie-sigma.vercel.app'),
  title: 'Bookie',
  description: 'Your Booking Platform Forever',
  manifest: '/manifest.webmanifest',
  keywords: 'Bookie, booking, appointments, calendar, schedule',
  robots: 'index, follow',
  applicationName: 'Bookie',
  alternates: {
    canonical: 'https://bookie-sigma.vercel.app',
  },
  // Icons and the OG image come from the app/icon.tsx, app/apple-icon.tsx and
  // app/opengraph-image.tsx file conventions. Declaring `icons` or
  // `openGraph.images` here would override those generated raster assets with
  // the SVG, which most social platforms refuse to render.
  openGraph: {
    url: 'https://bookie-sigma.vercel.app',
    type: 'website',
    title: 'Bookie',
    description:
      'Bookie is a booking platform that allows users to schedule appointments with service providers easily.',
    siteName: 'Bookie',
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
    // The font variable goes on <html> so it also covers antd portals (Modal,
    // Drawer, Select dropdowns), which render into document.body.
    <html lang='en' className={fontSans.variable}>
      <body>
        <AntdRegistry>
          <App>{children}</App>
        </AntdRegistry>
      </body>
    </html>
  )
}
