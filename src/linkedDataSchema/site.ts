import { Graph } from 'schema-dts'
import type { Locale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { absoluteUrl, getSiteUrl } from '@helpers/url'

const PUBLISHER_ID = `${getSiteUrl()}#organization`

/**
 * Site-level identity, emitted once on the home page.
 *
 * Without a `WebSite`/`Organization` pair every provider and organization node in
 * the app is an orphan — nothing states who publishes them. `publisher` on each
 * collection page then resolves back here by `@id`, which is how a crawler (and an
 * LLM summarising "what is Bookie") ties the whole site to one entity.
 */
/**
 * The `WebSite` and `Organization` `@id`s stay locale-free on purpose: they name
 * one real-world entity that all 15 language variants share, so every page must
 * resolve `publisher` to the same node. Only the `WebPage` — which genuinely is a
 * different document per language — carries the locale, and it is the node whose
 * `url` has to agree with that page's canonical.
 */
export const getSiteLDSchema = (locale: Locale): Graph => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${getSiteUrl()}#website`,
      name: 'Bookie',
      alternateName: 'Bookie Booking Platform',
      description: 'Bookie is a booking platform for scheduling appointments with service providers.',
      url: getSiteUrl(),
      inLanguage: locale,
      publisher: { '@id': PUBLISHER_ID },
    },
    {
      '@type': 'Organization',
      '@id': PUBLISHER_ID,
      name: 'Bookie',
      url: getSiteUrl(),
      logo: absoluteUrl('/icon'),
      description: 'Your Booking Platform Forever',
    },
    {
      '@type': 'WebPage',
      '@id': absoluteUrl(localePath(locale, ROUTES[ROUTE_KEYS.home])),
      name: 'Bookie',
      description: 'Find providers and organizations, then reserve a time that works.',
      url: absoluteUrl(localePath(locale, ROUTES[ROUTE_KEYS.home])),
      inLanguage: locale,
      isPartOf: { '@id': `${getSiteUrl()}#website` },
      about: { '@id': PUBLISHER_ID },
      // Named here so a crawler can reach the collections without crawling first.
      // Same-language collections: pointing an Arabic page at the English list
      // would hand a crawler a cross-language hop it has no reason to make.
      significantLink: [
        absoluteUrl(localePath(locale, ROUTES[ROUTE_KEYS.providers])),
        absoluteUrl(localePath(locale, ROUTES[ROUTE_KEYS.organizations])),
        absoluteUrl(localePath(locale, ROUTES[ROUTE_KEYS.categories])),
      ],
    },
  ],
})
