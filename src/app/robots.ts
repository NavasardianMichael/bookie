import type { MetadataRoute } from 'next'
import { ROUTES } from '@constants/routes'
import { absoluteUrl } from '@helpers/url'

/**
 * Points crawlers at the sitemap, which is the only place the 15 locale variants
 * of each route are enumerated — nothing links to `/th/categories` from an
 * English page except its `hreflang` tag.
 *
 * The disallowed paths are locale-agnostic patterns: every route is prefixed
 * (`/en/auth/...`, `/ja/auth/...`), so each rule needs the `*` wildcard rather
 * than a literal leading segment.
 *
 * The auth funnel and the signed-in areas are excluded because they have nothing
 * to index and would burn crawl budget across 15 locales apiece. They are not
 * secret — the proxy guard and the API's `requireProvider` do that job; robots
 * is a crawling hint, never an access control.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*/auth/',
        `/*${ROUTES.providerProfile}`,
        `/*${ROUTES.providerProfileCreation}`,
        `/*${ROUTES.providerServices}`,
        // The whole subtree, not just the profile page. Consumers are private
        // parties to a booking and have no public presence at all — no directory,
        // no detail page, and no API that would serve one. This is belt to that
        // braces: there is nothing under here to index even if a URL is guessed.
        '/*/consumers/',
        `/*${ROUTES.routesOverview}`,
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
