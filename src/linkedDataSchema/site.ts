import { Graph } from 'schema-dts'
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
export const getSiteLDSchema = (): Graph => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${getSiteUrl()}#website`,
      name: 'Bookie',
      alternateName: 'Bookie Booking Platform',
      description: 'Bookie is a booking platform for scheduling appointments with service providers.',
      url: getSiteUrl(),
      inLanguage: 'en',
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
      '@id': getSiteUrl(),
      name: 'Bookie',
      description: 'Find providers and organizations, then reserve a time that works.',
      url: getSiteUrl(),
      isPartOf: { '@id': `${getSiteUrl()}#website` },
      about: { '@id': PUBLISHER_ID },
      // Named here so a crawler can reach the collections without crawling first.
      significantLink: [
        absoluteUrl(ROUTES[ROUTE_KEYS.providers]),
        absoluteUrl(ROUTES[ROUTE_KEYS.organizations]),
        absoluteUrl(ROUTES[ROUTE_KEYS.categories]),
      ],
    },
  ],
})
