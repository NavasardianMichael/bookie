import { Open_Sans } from 'next/font/google'

/**
 * Open Sans is the app's primary typeface. It carries the numerals — times,
 * durations, prices — and is picked for its tall x-height at small metadata
 * sizes and unambiguous 1/l/I.
 *
 * Applied on <html> rather than the app shell so it also covers antd portals
 * (Modal, Drawer, Select dropdowns) which render into document.body.
 *
 * The variable is `--font-app`, NOT `--font-sans`: Tailwind v4 already defines
 * `--font-sans` in its default theme, and `:root` and next/font's generated class
 * have identical specificity — so the winner would depend on stylesheet order.
 * globals.css maps Tailwind's `--font-sans` onto this instead.
 */
export const fontSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app',
  adjustFontFallback: true,
})
