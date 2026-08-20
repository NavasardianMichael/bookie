type Props = {
  size?: number
  color?: string
}

/**
 * The Bookie glyph, matching public/logo.svg. Kept as inline JSX rather than a
 * file import so it can be rendered by `next/og` (satori) for the generated
 * favicon, apple-icon and OG image.
 */
export const BookieMark = ({ size = 40, color = 'currentColor' }: Props) => (
  <svg width={size} height={size} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M35.55,5.09H12.45A7,7,0,0,0,5.5,12V42.09H35.55a7,7,0,0,0,7-6.94V12A7,7,0,0,0,35.55,5.09ZM32.88,34a2.48,2.48,0,1,1,2.47-2.48A2.47,2.47,0,0,1,32.88,34Z'
      stroke={color}
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M22.89,24a5,5,0,0,1,0,10H14.64V14h8.25a5,5,0,0,1,0,10Z'
      stroke={color}
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path d='M22.89,24H14.64' stroke={color} strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)
