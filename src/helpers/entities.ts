import { AppRouteName } from '@interfaces/routes'
import { ROUTES } from '@constants/routes'
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
 * leading slash either. The result was `http://localhost:4142providers/<id>`.
 */
export const generateEntityUrl = (routeName: AppRouteName, entityId: string): string =>
  absoluteUrl(generateEntityPath(routeName, entityId))
