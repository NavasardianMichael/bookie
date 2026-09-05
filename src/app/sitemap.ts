import type { MetadataRoute } from 'next'
import { LOCALES } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { absoluteUrl } from '@helpers/url'

/**
 * Public, indexable routes — **locale-free paths**, one entry each. Every one is
 * emitted once per locale below.
 *
 * Deliberately excluded: the auth funnel and the signed-in areas (nothing to
 * index, and `/providers/profile*` is behind the proxy's guard), `/routes-overview`
 * (dev-only, `notFound()` in production), and the entity detail routes, which need
 * a data fetch — see the note at the bottom.
 */
const INDEXABLE_ROUTE_KEYS = [
  ROUTE_KEYS.home,
  ROUTE_KEYS.providers,
  ROUTE_KEYS.categories,
  ROUTE_KEYS.organizations,
  ROUTE_KEYS.contact,
  ROUTE_KEYS.terms,
  ROUTE_KEYS.privacy,
] as const

/** Marketing surfaces change more than legal boilerplate; crawlers use this as a hint. */
const CHANGE_FREQUENCY: Partial<Record<(typeof INDEXABLE_ROUTE_KEYS)[number], MetadataRoute.Sitemap[number]['changeFrequency']>> =
  {
    [ROUTE_KEYS.home]: 'weekly',
    [ROUTE_KEYS.providers]: 'daily',
    [ROUTE_KEYS.categories]: 'weekly',
    [ROUTE_KEYS.organizations]: 'daily',
    [ROUTE_KEYS.terms]: 'yearly',
    [ROUTE_KEYS.privacy]: 'yearly',
  }

/**
 * One entry per route per locale, each carrying the full `alternates.languages`
 * set so crawlers see the 15 variants as one page in many languages rather than
 * 15 competing near-duplicates.
 *
 * Not yet listed: `/providers/[providerId]`, `/categories/[categoryId]` and
 * `/organizations/[organizationId]`. Those need a fetch of every published id,
 * and the list endpoints are unpaginated today — worth adding once there is a
 * real catalogue behind them, since detail pages are the ones with long-tail
 * search value.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return INDEXABLE_ROUTE_KEYS.flatMap((routeName) => {
    const path = ROUTES[routeName]

    const languages = Object.fromEntries(LOCALES.map((locale) => [locale, absoluteUrl(localePath(locale, path))]))

    return LOCALES.map((locale) => ({
      url: absoluteUrl(localePath(locale, path)),
      lastModified,
      changeFrequency: CHANGE_FREQUENCY[routeName],
      alternates: { languages },
    }))
  })
}
