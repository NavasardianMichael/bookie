import { ImageResponse } from 'next/og'
import { BookieMark } from '@components/brand/BookieMark'
import { BRAND, NEUTRAL } from '@styles/tokens'

export const alt = 'Bookie — Your Booking Platform Forever'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 32,
          padding: '0 96px',
          background: BRAND[900],
          color: NEUTRAL[0],
        }}
      >
        <BookieMark size={104} color={NEUTRAL[0]} />
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>Bookie</div>
        <div style={{ display: 'flex', fontSize: 40, color: BRAND[200] }}>Your Booking Platform Forever</div>
      </div>
    ),
    size
  )
}
