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
  rules: {
    '*.svg': {
      loaders: [
        {
          loader: '@svgr/webpack',
          options: {
            icon: true,
          },
        },
      ],
      as: '*.js',
    },
  },
}

export default nextConfig
