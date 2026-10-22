import type { MetadataRoute } from 'next'
import { ROUTES } from '@constants/routes'
import { absoluteUrl } from '@helpers/url'

/**
 * Points crawlers at the sitemap, which is the only place the 16 locale variants
 * of each route are enumerated — nothing links to `/th/categories` from an
 * English page except its `hreflang` tag.
 *
 * The disallowed paths are locale-agnostic patterns: every route is prefixed
 * (`/en/auth/...`, `/ja/auth/...`), so each rule needs the `*` wildcard rather
 * than a literal leading segment.
 *
 * The auth funnel and the signed-in areas are excluded because they have nothing
 * to index and would burn crawl budget across 16 locales apiece. They are not
 * secret — the proxy guard and the API's `requireProvider` do that job; robots
 * is a crawling hint, never an access control.
 */
/**
 * AI search and answer engines, named so the welcome is explicit rather than implied by `*`:
 * provider pages are meant to be found and cited there too. They get the same disallows —
 * a group naming a crawler replaces `*` for it, so the private areas must be repeated.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
]

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/*/auth/',
    `/*${ROUTES.providerProfile}`,
    `/*${ROUTES.providerServices}`,
    `/*${ROUTES.bookings}`,
    `/*${ROUTES.favorites}`,
    // Checkout and its return page: transient steps of a payment, nothing to index.
    '/*/billing/',
    // The whole subtree, not just the profile page. Consumers are private
    // parties to a booking and have no public presence at all — no directory,
    // no detail page, and no API that would serve one. This is belt to that
    // braces: there is nothing under here to index even if a URL is guessed.
    '/*/consumers/',
    `/*${ROUTES.routesOverview}`,
  ]

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: AI_CRAWLERS, allow: ['/', `${ROUTES.providerPage}/`, '/llms.txt'], disallow },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
