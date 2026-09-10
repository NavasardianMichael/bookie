import { ImageResponse } from 'next/og'
import { BookieAppIcon } from '@components/brand/BookieAppIcon'

/**
 * iOS applies its own mask, so this stays a filled square (see BookieAppIcon).
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<BookieAppIcon markSize={112} />, size)
}
