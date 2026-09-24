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
export const SITE_URL_FALLBACK = 'http://localhost:7004'

/**
 * The longest one API request may take before it fails as a `timeout`. axios's default is
 * no limit at all, which turned a hung API into a skeleton that never resolved and a
 * submit button that never stopped spinning.
 */
export const API_REQUEST_TIMEOUT_MS = 30_000

/**
 * Multipart bodies — a profile image, the gallery, a service image — get longer: a photo
 * off a phone on a slow uplink can legitimately take a minute to send.
 */
export const API_UPLOAD_TIMEOUT_MS = 120_000
