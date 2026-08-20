import { ImageResponse } from 'next/og'
import { BookieMark } from '@components/brand/BookieMark'
import { BRAND, NEUTRAL } from '@styles/tokens'

/**
 * Rendered rather than committed: public/ only holds the source SVG, and a PWA
 * icon has to be raster. 512px covers the favicon, the install prompt and the
 * home-screen icon, since browsers downscale from the largest available.
 */
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND[900],
          borderRadius: 112,
        }}
      >
        <BookieMark size={320} color={NEUTRAL[0]} />
      </div>
    ),
    size
  )
}
