import { AppRouteName } from '@interfaces/routes'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { absoluteUrl } from './url'

/**
 * Root-relative path of an entity's page — what `next/link` and `router.push` want.
 *
 * Composing from `ROUTES` here is what keeps path strings out of components.
 */
/**
 * `ROUTES.home` is `'/'`, so a naive template yields `//<id>` — and a leading `//` is a
 * protocol-relative URL, not a path, which makes it an open-redirect shape rather than
 * merely an ugly one. The trailing slash is stripped so every route composes the same way.
 */
export const generateEntityPath = (routeName: AppRouteName, entityId: string): string =>
  `${ROUTES[routeName].replace(/\/$/, '')}/${entityId}`

/**
 * Canonical public URL of an entity's page.
 *
 * Two bugs this used to have, both of which made every JSON-LD `url` unusable: it
 * built on NEXT_PUBLIC_API_URL — the backend origin, which serves no pages — and
 * it interpolated the route *key* rather than the route path, so there was no
 * leading slash either. The result was `http://localhost:9004providers/<id>`.
 */
export const generateEntityUrl = (routeName: AppRouteName, entityId: string): string =>
  absoluteUrl(generateEntityPath(routeName, entityId))

/** Anything that names a provider's public page: every provider payload carries both. */
export type ProviderPageRef = { id: string; slug?: string | null }

/** The `<key>` of `/p/<key>`: the provider's slug when they set one, otherwise their id. */
export const providerPageKey = ({ id, slug }: ProviderPageRef): string => slug || id

/**
 * The public provider page, `/p/<slug ?? id>` — the one page route with no locale segment
 * (`isLocaleFreePath`), so this path is the canonical URL as it stands. Every link to a
 * provider's page is built here: one built from the id alone would point at a URL the page
 * canonicalises away from once the provider has a slug.
 */
export const providerPagePath = (provider: ProviderPageRef): string =>
  `${ROUTES[ROUTE_KEYS.providerPage]}/${encodeURIComponent(providerPageKey(provider))}`

/** `providerPagePath` on the site origin — the page's canonical URL. */
export const providerPageUrl = (provider: ProviderPageRef): string => absoluteUrl(providerPagePath(provider))
