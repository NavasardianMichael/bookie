import type { MetadataRoute } from 'next'
import { getProvidersSitemapAPI } from '@api/providers/main'
import { LOCALES } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { providerPageUrl } from '@helpers/entities'
import { reportError } from '@helpers/reportError'
import { absoluteUrl } from '@helpers/url'

/** Read per request: a provider who publishes or edits their page is listed with its new date at once. */
export const dynamic = 'force-dynamic'

/**
 * Public, indexable routes — **locale-free paths**, one entry each. Every one is
 * emitted once per locale below.
 *
 * Deliberately excluded: the auth funnel and the signed-in areas (nothing to
 * index, and `/providers/profile*` is behind the proxy's guard) and `/routes-overview`
 * (dev-only, `notFound()` in production). Provider pages are listed separately below.
 */
const INDEXABLE_ROUTE_KEYS = [
  ROUTE_KEYS.home,
  ROUTE_KEYS.providers,
  ROUTE_KEYS.categories,
  ROUTE_KEYS.organizations,
  ROUTE_KEYS.pricing,
  ROUTE_KEYS.contact,
  ROUTE_KEYS.terms,
  ROUTE_KEYS.privacy,
  ROUTE_KEYS.refundPolicy,
] as const

/** Marketing surfaces change more than legal boilerplate; crawlers use this as a hint. */
const CHANGE_FREQUENCY: Partial<Record<(typeof INDEXABLE_ROUTE_KEYS)[number], MetadataRoute.Sitemap[number]['changeFrequency']>> =
  {
    [ROUTE_KEYS.home]: 'weekly',
    [ROUTE_KEYS.providers]: 'daily',
    [ROUTE_KEYS.categories]: 'weekly',
    [ROUTE_KEYS.organizations]: 'daily',
    [ROUTE_KEYS.pricing]: 'monthly',
    [ROUTE_KEYS.terms]: 'yearly',
    [ROUTE_KEYS.privacy]: 'yearly',
    [ROUTE_KEYS.refundPolicy]: 'yearly',
  }

/**
 * One entry per static route per locale, each carrying the full `alternates.languages` set
 * so crawlers see the 16 variants as one page in many languages — and then **one entry per
 * listed provider**.
 *
 * A provider page is a single URL, `/p/<slug ?? id>`, whatever the language (`?lang=`, never a
 * path segment), so it is listed once with no alternates. `lastModified` is the provider's
 * `seoUpdatedAt`: moved by the API only when something search engines see on the page
 * changed — a service, a category, the address, an override on the SEO tab, a new review —
 * so a crawler that trusts `lastmod` re-reads exactly the pages that changed.
 *
 * A failed provider read is reported and the static entries still go out: a sitemap missing
 * its providers for one fetch is better than no sitemap.
 *
 * Google reads at most 50,000 URLs per sitemap: 144 static entries leave room for ~49,800
 * providers. Past that, split the providers out with `generateSitemaps`.
 *
 * `/categories/[categoryId]` and `/organizations/[organizationId]` are not listed yet.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const pages: MetadataRoute.Sitemap = INDEXABLE_ROUTE_KEYS.flatMap((routeName) => {
    const path = ROUTES[routeName]

    const languages = Object.fromEntries(LOCALES.map((locale) => [locale, absoluteUrl(localePath(locale, path))]))

    return LOCALES.map((locale) => ({
      url: absoluteUrl(localePath(locale, path)),
      lastModified,
      changeFrequency: CHANGE_FREQUENCY[routeName],
      alternates: { languages },
    }))
  })

  const providers = await getProvidersSitemapAPI().catch((error: unknown) => {
    reportError(error, 'sitemap:providers')
    return []
  })

  return [
    ...pages,
    ...providers.map((provider) => ({
      url: providerPageUrl(provider),
      lastModified: new Date(provider.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
