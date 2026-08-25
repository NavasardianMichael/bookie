const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4142'

/**
 * The API returns root-relative upload paths (`/uploads/<file>`) but serves those
 * files from its own origin. Left alone, the Next app requests them from itself
 * and gets a 404, so every provider image silently fails.
 */
export const resolveAssetUrl = (src?: string): string | undefined => {
  if (!src) return undefined
  if (/^(https?:|data:|blob:)/.test(src)) return src
  if (src.startsWith('/uploads/')) return `${API_ORIGIN}${src}`
  return src
}

/** Deterministic initials for the avatar fallback. */
export const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
