import { AppRouteName } from '@interfaces/routes'
import { ROUTES } from '@constants/routes'
import { absoluteUrl } from './url'

/**
 * Canonical public URL of an entity's page.
 *
 * Two bugs this used to have, both of which made every JSON-LD `url` unusable: it
 * built on NEXT_PUBLIC_API_URL — the backend origin, which serves no pages — and
 * it interpolated the route *key* rather than the route path, so there was no
 * leading slash either. The result was `http://localhost:4142providers/<id>`.
 */
export const generateEntityUrl = (routeName: AppRouteName, entityId: string): string =>
  absoluteUrl(`${ROUTES[routeName]}/${entityId}`)
