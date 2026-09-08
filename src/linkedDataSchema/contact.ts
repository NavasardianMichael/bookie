import { Graph } from 'schema-dts'
import type { Locale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { absoluteUrl, getSiteUrl } from '@helpers/url'
import { getBreadcrumbLDSchema } from './breadcrumbs'

/**
 * `ContactPage` is the schema.org type for exactly this page, and saying so is what lets
 * a crawler surface it as the site's contact route rather than as one more `WebPage`.
 *
 * `about` and `isPartOf` resolve to the site-level nodes emitted on the home page. Those
 * `@id`s stay locale-free for the reason `site.ts` gives: one real-world entity that all
 * 15 language variants share. Only this page's own node carries the locale, and its `url`
 * has to agree with the page's canonical — which is why the path goes through
 * `localePath` rather than being used bare.
 */
export const getContactPageLDSchema = (locale: Locale): Graph => {
  const pageUrl = absoluteUrl(localePath(locale, ROUTES[ROUTE_KEYS.contact]))

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': pageUrl,
        name: 'Contact Bookie',
        description: 'Send the Bookie team a message about bookings, an account, or a provider listing.',
        url: pageUrl,
        inLanguage: locale,
        isPartOf: { '@id': `${getSiteUrl()}#website` },
        about: { '@id': `${getSiteUrl()}#organization` },
      },
      getBreadcrumbLDSchema([
        { name: 'Home', path: ROUTES[ROUTE_KEYS.home] },
        { name: 'Contact', path: ROUTES[ROUTE_KEYS.contact] },
      ]),
    ],
  }
}
