import { ImageResponse } from 'next/og'
import { BookieAppIcon } from '@components/brand/BookieAppIcon'

/**
 * Maskable PWA icon. Android adaptive icons crop to a circle / squircle; the
 * mark sits inside the inner 80% safe zone so it is never clipped.
 *
 * No file extension, so `src/proxy.ts` must list `/icon-maskable` in
 * `LOCALE_AGNOSTIC_METADATA` or the locale prefix 307s this to a 404.
 */
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'
export const dynamic = 'force-static'

export function GET(): ImageResponse {
  return new ImageResponse(<BookieAppIcon markSize={288} />, size)
}
