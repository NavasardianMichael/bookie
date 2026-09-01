import { Manrope } from 'next/font/google'

/**
 * Manrope is the app's primary typeface, matching `design/initial prototype`.
 * Geometric enough for the marketing display sizes, with a tall x-height that
 * still holds times, durations and prices at caption size.
 *
 * Applied on <html> rather than the app shell so it also covers antd portals
 * (Modal, Drawer, Select dropdowns) which render into document.body.
 *
 * The variable is `--font-app`, NOT `--font-sans`: Tailwind v4 already defines
 * `--font-sans` in its default theme, and `:root` and next/font's generated class
 * have identical specificity — so the winner would depend on stylesheet order.
 * globals.css maps Tailwind's `--font-sans` onto this instead.
 */
export const fontSans = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app',
  adjustFontFallback: true,
})
