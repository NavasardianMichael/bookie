import { ImageResponse } from 'next/og'
import { BookieAppIcon } from '@components/brand/BookieAppIcon'

/**
 * Rendered rather than committed: public/ only holds the source SVG, and a PWA
 * icon has to be raster. 512px covers the install prompt and the home-screen
 * icon; browsers downscale from the largest available.
 *
 * The tab icon is `favicon.ico`, which Next lists ahead of this file. That ICO
 * is the same mark in `BRAND[900]` on a transparent ground — the filled tile
 * here is only for install icons. Regenerate the ICO when this mark changes.
 *
 * Full-bleed square — the OS applies its own mask. A baked-in radius left
 * transparent corners that some launchers filled with black.
 */
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<BookieAppIcon markSize={320} />, size)
}
