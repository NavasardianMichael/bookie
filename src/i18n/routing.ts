import { defineRouting } from 'next-intl/routing'
import { DEFAULT_LOCALE, LOCALES } from './config'

/**
 * The locale lives in the path — `/en/providers`, `/es/providers` — so every
 * language is a distinct, crawlable URL with its own metadata and JSON-LD.
 *
 * `localePrefix: 'always'` prefixes English too. The alternative, leaving `en`
 * bare, makes one locale behave unlike the other fourteen in the proxy, the
 * sitemap and the canonical/hreflang logic, for no gain on a product with no
 * inbound links to preserve yet.
 *
 * `localeDetection` is **off on purpose**, and `src/proxy.ts` negotiates instead.
 * next-intl's built-in detection lets an exact match on a lower-preference tag
 * beat a best-fit match on a higher-preference one, which strands real users on
 * English — verified against `@formatjs/intl-localematcher` 0.8.13:
 *
 *   pt-PT,en;q=0.9   -> en   (should be pt-BR)
 *   zh-TW,en;q=0.9   -> en   (should be zh-CN)
 *   es-419,en;q=0.9  -> en   (should be es)
 *
 * A secondary English preference is near-universal in browsers, so this would
 * have hit a large share of exactly the markets we are adding. `matchAcceptLanguage`
 * treats quality as the outer loop and gets all three right.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  localeDetection: false,
})
