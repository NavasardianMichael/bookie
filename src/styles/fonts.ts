import {
  Manrope,
  Noto_Sans_Arabic,
  Noto_Sans_Armenian,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Sans_Thai,
} from 'next/font/google'
import type { Locale } from '@i18n/config'

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
 *
 * `subsets: ['latin']` is **not** a restriction on what gets served. next/font
 * never puts a `subset` param on the Google CSS request (see
 * `next/dist/compiled/@next/font/dist/google/get-google-fonts-url.js`), so the
 * full set of `unicode-range` slices — latin-ext, cyrillic, greek — is always
 * downloaded and self-hosted. `subsets` only decides which of those files get a
 * `<link rel="preload">`. Latin is the right thing to preload because it is the
 * default locale; Polish diacritics and Ukrainian Cyrillic still render from
 * Manrope, one lazy fetch later, under `display: 'swap'`.
 */
export const fontSans = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app',
  adjustFontFallback: true,
})

/**
 * Manrope covers Latin, Cyrillic and Greek and **nothing else** — it has no
 * glyphs at all for Arabic, Armenian, Thai or CJK, so those six locales need a
 * second family or they fall through to the OS default at a different metric.
 *
 * All six share the `--font-script` variable and only the active locale's class
 * goes on <html>, so exactly one is ever live. They are appended *after* Manrope
 * in the stack rather than replacing it, which lets per-glyph fallback do the
 * work: Latin text inside an Arabic UI still renders in Manrope.
 *
 * Every one is `preload: false`, for two reasons. Preloading is global rather
 * than per-locale, so preloading all six would cost every visitor five fonts
 * they cannot read. And the three CJK families expose no CJK subset name at all
 * — Google serves them as hundreds of `unicode-range` slices — so next/font
 * errors out if preload is left on without a subset it can name.
 *
 * `adjustFontFallback` is off: it derives fallback metrics from the face itself,
 * and a metric override computed for Latin is the wrong correction for these.
 *
 * The identical options object is repeated at each call rather than hoisted to a
 * shared const on purpose — next/font reads these arguments at build time and
 * rejects anything that is not a literal ("Font loader values must be explicitly
 * written literals"). Do not DRY this up; it will not compile.
 */
const fontArabic = Noto_Sans_Arabic({
  display: 'swap',
  variable: '--font-script',
  preload: false,
  adjustFontFallback: false,
})
const fontArmenian = Noto_Sans_Armenian({
  display: 'swap',
  variable: '--font-script',
  preload: false,
  adjustFontFallback: false,
})
const fontThai = Noto_Sans_Thai({
  display: 'swap',
  variable: '--font-script',
  preload: false,
  adjustFontFallback: false,
})
const fontChinese = Noto_Sans_SC({
  display: 'swap',
  variable: '--font-script',
  preload: false,
  adjustFontFallback: false,
})
const fontJapanese = Noto_Sans_JP({
  display: 'swap',
  variable: '--font-script',
  preload: false,
  adjustFontFallback: false,
})
const fontKorean = Noto_Sans_KR({
  display: 'swap',
  variable: '--font-script',
  preload: false,
  adjustFontFallback: false,
})

/**
 * The extra class <html> carries for locales Manrope cannot render. Latin- and
 * Cyrillic-script locales map to `undefined` — Manrope already covers them, and
 * `--font-script` then stays undefined, which is why globals.css reads it
 * through a `var()` fallback rather than declaring a default on `:root`.
 */
const SCRIPT_FONT_CLASSES: Partial<Record<Locale, string>> = {
  ar: fontArabic.variable,
  hy: fontArmenian.variable,
  th: fontThai.variable,
  'zh-CN': fontChinese.variable,
  ja: fontJapanese.variable,
  ko: fontKorean.variable,
}

export const getScriptFontClass = (locale: Locale): string | undefined => SCRIPT_FONT_CLASSES[locale]
