/**
 * Public origin used when NEXT_PUBLIC_SITE_URL is unset.
 *
 * This is the host that serves the pages — deliberately not NEXT_PUBLIC_API_URL,
 * which points at the backend. Canonical URLs and JSON-LD `@id`s must name the
 * former or crawlers resolve the entity to a host with no page on it.
 */
export const SITE_URL_FALLBACK = 'https://bookie-sigma.vercel.app'
