import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { ROUTES } from '@constants/routes'

/**
 * Not an `import`: Next transpiles this file with SWC using tsconfig `paths`, and the
 * catch-all `@*` → `./src/*` rewrites every scoped package — `@sentry/nextjs/config` became
 * `./src/sentry/nextjs/config` and the build could not load its config. SWC leaves a plain
 * `require` alone, and `typeof import` keeps it typed.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
const { withSentryConfig } = require('@sentry/nextjs/config') as typeof import('@sentry/nextjs/config')

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9004')
const apiIsLoopback =
  apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1' || apiUrl.hostname === '::1'

// Points next-intl at the per-request config. Without the explicit path it looks
// for `./i18n/request.ts` relative to the project root, not `./src/i18n/`.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Emits `.next/standalone` — server.js plus only the traced node_modules — so a release
  // tarball carries its own runtime and the deploy host never runs an install. The project
  // root is the repo root, so the default `outputFileTracingRoot` already covers the
  // workspace. `public/` and `.next/static` are NOT copied in by the build; the deploy
  // workflow does that. See docs/DEPLOYMENT.md.
  output: 'standalone',
  // nft traces @swc/helpers through its CommonJS entry, so the standalone bundle gets the
  // package manifest and `cjs/` but none of `esm/` — which is what the compiled server
  // actually imports through the package's `exports` map. A manifest that resolves while
  // the file behind it is absent is exactly ERR_MODULE_NOT_FOUND at boot, and it happens
  // only in the standalone output, so `next start` never reproduces it. Force the whole
  // package in: pnpm keeps the real files in the virtual store, and the hoisted path is
  // listed for a non-pnpm install. A pattern that matches nothing is ignored.
  outputFileTracingIncludes: {
    '/*': [
      'node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**',
      'node_modules/@swc/helpers/**',
    ],
  },
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
    // Next 16 still 400s a matching remotePattern when the hostname resolves to a
    // private IP (SSRF guard). Local uploads live on localhost:9004, so the
    // optimizer breaks every avatar until we opt in. Production points at a
    // public API host, so this stays off there.
    dangerouslyAllowLocalIP: apiIsLoopback,
    formats: ['image/avif', 'image/webp'],
  },
  /**
   * User agents that get `generateMetadata`'s tags in `<head>`, blocking, instead of streamed
   * into `<body>` after the page. Next's default list (copied from
   * `next/dist/shared/lib/router/utils/html-bots.js` — setting this *replaces* it) plus the
   * AI crawlers, which read the raw HTML without running scripts: without this, a provider
   * page's title and description reach them late or not at all. Recheck the default list
   * after a Next upgrade.
   */
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Bytespider|Amazonbot|cohere-ai|DuckAssistBot/i,
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

/**
 * Sentry's build step — browser only: there is no `instrumentation.ts`, so neither this
 * server nor the API reports. Source maps go up only when the build has `SENTRY_AUTH_TOKEN`
 * (with `SENTRY_ORG` / `SENTRY_PROJECT`, which the plugin reads itself), and are then removed
 * from the bundle.
 *
 * No `tunnelRoute`: in SDK 11.13 the tunnel is answered by the *server* SDK, which this
 * app does not run, so the browser posts straight to sentry.io. An ad blocker that drops
 * those requests drops the errors with them.
 */
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
})
