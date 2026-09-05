import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { ROUTES } from '@constants/routes'

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4142')

// Points next-intl at the per-request config. Without the explicit path it looks
// for `./i18n/request.ts` relative to the project root, not `./src/i18n/`.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    // Uploads are served by the API on its own origin, so next/image has to be
    // told to allow it. See src/helpers/images.ts.
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      {
        source: ROUTES.auth,
        destination: ROUTES.accountTypeSelection,
        permanent: true,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
