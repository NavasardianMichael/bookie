import { AppRouteName } from '@interfaces/routes'
import { ROUTES } from '@constants/routes'
import { absoluteUrl } from './url'

/**
 * Root-relative path of an entity's page — what `next/link` and `router.push` want.
 *
 * Composing from `ROUTES` here is what keeps path strings out of components.
 */
export const generateEntityPath = (routeName: AppRouteName, entityId: string): string =>
  `${ROUTES[routeName]}/${entityId}`

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
