/**
 * Public origin used when NEXT_PUBLIC_SITE_URL is unset.
 *
 * This is the host that serves the pages — deliberately not NEXT_PUBLIC_API_URL,
 * which points at the backend. Canonical URLs and JSON-LD `@id`s must name the
 * former or crawlers resolve the entity to a host with no page on it.
 *
 * The fallback is the local dev origin, so an unset variable can never leak a
 * wrong host into production metadata — set NEXT_PUBLIC_SITE_URL when deploying.
 */
export const SITE_URL_FALLBACK = 'http://localhost:4141'
