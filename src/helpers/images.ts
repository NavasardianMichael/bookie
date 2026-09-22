import { absoluteUrl } from './url'

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9004'
const UPLOADS_PREFIX = '/uploads/'

/**
 * The API returns root-relative upload paths (`/uploads/<file>`) but serves those
 * files from its own origin. Left alone, the Next app requests them from itself
 * and gets a 404, so every provider image silently fails.
 *
 * Prefixing is not enough on its own in local dev: Next 16's image optimizer
 * then refuses `localhost` as a private IP (SSRF guard) unless
 * `images.dangerouslyAllowLocalIP` is on — see `next.config.ts`.
 */
export const resolveAssetUrl = (src?: string): string | undefined => {
  if (!src) return undefined
  if (/^(https?:|data:|blob:)/.test(src)) return src
  if (src.startsWith(UPLOADS_PREFIX)) return `${API_ORIGIN}${src}`
  return src
}

/**
 * Same resolution, but never root-relative.
 *
 * Structured data and Open Graph tags are read away from the page that served
 * them, so a bare `/logo.svg` resolves against whatever origin the consumer
 * happens to be on — or nothing at all. `image` in JSON-LD must be absolute.
 */
export const resolveAbsoluteAssetUrl = (src?: string): string | undefined => {
  const resolved = resolveAssetUrl(src)
  if (!resolved) return undefined

  return /^(https?:|data:)/.test(resolved) ? resolved : absoluteUrl(resolved)
}

/**
 * Whether the asset is a real user upload rather than a bundled site asset.
 *
 * Only uploads are worth overriding `opengraph-image.tsx` with: the seeded
 * placeholder is `/logo.svg`, and most social platforms refuse to render an SVG,
 * so pointing OG at it would replace a working card with a broken one.
 */
export const isUploadedAsset = (src?: string): boolean =>
  !!src && (src.startsWith(UPLOADS_PREFIX) || /^https?:/.test(src))

/**
 * What an avatar may paint. Crop blobs and real uploads, never the seeded `/logo.svg`
 * — that mark is the site logo, not a face, and it is what used to sit in the header
 * after Save draft because the live column still held the placeholder.
 */
export const resolveAvatarSrc = (src?: string): string | undefined => {
  if (!src) return undefined
  if (/^(blob:|data:)/.test(src)) return src
  return isUploadedAsset(src) ? resolveAssetUrl(src) : undefined
}

/** Deterministic initials for the avatar fallback. */
export const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
