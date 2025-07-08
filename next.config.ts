import type { NextConfig } from 'next'
import { ROUTES } from '@constants/routes'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: ROUTES.auth,
        destination: ROUTES.accountTypeSelection,
        permanent: true,
      },
    ]
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })

    return config
  },
}

export default nextConfig
