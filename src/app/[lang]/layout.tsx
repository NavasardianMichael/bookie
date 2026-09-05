import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getAntdLocale } from '@i18n/antdLocale'
import { getDirection, LOCALES } from '@i18n/config'
import { routing } from '@i18n/routing'
import { cn } from '@helpers/cn'
import { getSiteUrl } from '@helpers/url'
import { App } from '@components/App'
import '@styles/globals.css'
import { fontSans, getScriptFontClass } from '@styles/fonts'
import { BRAND, CSS_VAR_SCOPE } from '@styles/tokens'

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
  metadataBase: new URL(getSiteUrl()),
  // `template` is what lets child routes export a bare title. Without it a child
  // `title` replaces this one wholesale, which is why every page used to repeat
  // the "Bookie | " prefix by hand.
  title: {
    default: 'Bookie',
    template: '%s | Bookie',
  },
  description: 'Your Booking Platform Forever',
  manifest: '/manifest.webmanifest',
  keywords: 'Bookie, booking, appointments, calendar, schedule',
  robots: 'index, follow',
  applicationName: 'Bookie',
  // No `alternates.canonical` or `openGraph.url` here: metadata is inherited, so
  // an absolute value at the root stamped the homepage URL onto every route and
  // told crawlers each page was a duplicate of `/`. Each route declares its own.
  //
  // Icons and the OG image come from the app/icon.tsx, app/apple-icon.tsx and
  // app/opengraph-image.tsx file conventions. Declaring `icons` or
  // `openGraph.images` here would override those generated raster assets with
  // the SVG, which most social platforms refuse to render.
  openGraph: {
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

/**
 * Prerenders the shell for all 15 locales. Without this every route would be
 * dynamic purely because the locale is a dynamic segment.
 */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  // A path segment is arbitrary user input until proven otherwise; an unknown
  // one must 404 rather than reach a missing catalogue import.
  if (!hasLocale(routing.locales, lang)) notFound()

  const locale = lang
  const direction = getDirection(locale)

  // Loaded on the server so only the active locale's ~6-10KB crosses the RSC
  // boundary and none of the 15 antd bundles enter the client bundle.
  const antdLocale = await getAntdLocale(locale)

  return (
    // The font variables go on <html> so they also cover antd portals (Modal,
    // Drawer, Select dropdowns), which render into document.body. The script
    // face is present only for locales Manrope cannot render.
    //
    // CSS_VAR_SCOPE is the class antd scopes its `--ant-*` block to (see
    // theme.ts). On <html> it puts every token on `:root`, which is what the
    // globals.css alias block and every `bg-brand`/`rounded-brand` utility read.
    <html lang={locale} dir={direction} className={cn(fontSans.variable, getScriptFontClass(locale), CSS_VAR_SCOPE)}>
      <body>
        <AntdRegistry>
          {/* Messages are picked up from the request config, so no `messages`
              prop: next-intl streams them to the client provider itself. */}
          <NextIntlClientProvider>
            <App antdLocale={antdLocale} direction={direction} locale={locale}>
              {children}
            </App>
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
