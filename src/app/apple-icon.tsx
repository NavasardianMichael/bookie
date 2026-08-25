import { ImageResponse } from 'next/og'
import { BookieMark } from '@components/brand/BookieMark'
import { BRAND, NEUTRAL } from '@styles/tokens'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // iOS applies its own mask, so this stays a filled square.
          background: BRAND[900],
        }}
      >
        <BookieMark size={112} color={NEUTRAL[0]} />
      </div>
    ),
    size
  )
}
