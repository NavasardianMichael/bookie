import { Inter } from 'next/font/google'

/**
 * Inter carries the app's numerals — times, durations, prices — so it is picked
 * for its tabular figures, tall x-height at small metadata sizes, and
 * unambiguous 1/l/I.
 *
 * Applied on <html> rather than the app shell so it also covers antd portals
 * (Modal, Drawer, Select dropdowns) which render into document.body.
 *
 * The variable is `--font-app`, NOT `--font-sans`: Tailwind v4 already defines
 * `--font-sans` in its default theme, and `:root` and next/font's generated class
 * have identical specificity — so the winner would depend on stylesheet order.
 * globals.css maps Tailwind's `--font-sans` onto this instead.
 */
export const fontSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app',
  adjustFontFallback: true,
})
