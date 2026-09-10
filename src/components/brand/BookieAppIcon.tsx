import { BRAND, NEUTRAL } from '@styles/tokens'
import { BookieMark } from './BookieMark'

type BookieAppIconProps = {
  /** Glyph size in px. Keep well inside the canvas — maskable icons need a ~80% safe zone. */
  markSize: number
}

/**
 * Shared satori tree for the generated PWA icons. `next/og` cannot resolve CSS
 * variables or Tailwind, so colours come from `tokens.ts` as literal hex.
 *
 * Full-bleed square on purpose: the OS applies its own mask. Baking a radius
 * here left transparent corners that some launchers filled with black.
 */
export const BookieAppIcon = ({ markSize }: BookieAppIconProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: BRAND[900],
    }}
  >
    <BookieMark size={markSize} color={NEUTRAL[0]} />
  </div>
)
