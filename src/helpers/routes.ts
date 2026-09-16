import { AppRouteName } from '@interfaces/routes'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'

const normalize = (pathname: string) => pathname.replace(/\/+$/, '') || '/'

/** Longest path first, so `/providers/profile-services` wins over `/providers`. */
const ROUTE_ENTRIES = (Object.entries(ROUTES) as [AppRouteName, string][]).sort(([, a], [, b]) => b.length - a.length)

const matches = (path: string, route: string) =>
  route === '/' ? path === '/' : path === route || path.startsWith(`${route}/`)

/**
 * Resolves a pathname to a route name by longest-prefix match.
 *
 * `ROUTE_KEYS_BY_VALUES` only matches exact static paths, so a dynamic route like
 * `/providers/abc` resolved to `undefined` and the header's back arrow and logo
 * were being chosen by accident.
 */
export const matchRouteName = (pathname: string): AppRouteName | undefined =>
  ROUTE_ENTRIES.find(([, route]) => matches(normalize(pathname), route))?.[0]

export const isRouteActive = (pathname: string, route: string): boolean => matches(normalize(pathname), route)

/**
 * Explore is `/providers` exactly. A public booking page is `/providers/<id|slug>`.
 * Account routes (`/providers/profile…`) match a longer prefix and are not this.
 */
export const isPublicProviderPage = (pathname: string): boolean => {
  const path = normalize(pathname)
  return matchRouteName(path) === ROUTE_KEYS.providers && path !== ROUTES[ROUTE_KEYS.providers]
}
