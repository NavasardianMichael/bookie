import { isLocale, type Locale } from './config'

export type SplitPathname = {
  /** `undefined` when the path carries no locale prefix at all. */
  locale?: Locale
  /** The path as `src/constants/routes.ts` declares it, with no locale segment. */
  pathname: string
}

/**
 * Splits `/es/providers/abc` into `{ locale: 'es', pathname: '/providers/abc' }`.
 *
 * Every internal path constant is locale-free, so anything that compares a live
 * URL against `ROUTES` — the proxy's auth guard, `matchRouteName`,
 * `isRouteActive` — has to strip the prefix first. next-intl's `usePathname`
 * does this for client components; this is the same operation for the proxy,
 * which runs before any of that exists.
 */
/**
 * The inverse: a locale-free route path prefixed for one locale.
 *
 * `ROUTES.home` is `'/'`, which would otherwise yield `/en/` — a second URL for
 * the same page, and a redirect hop for anything that follows it.
 *
 * Lives here rather than in `metadata.ts` so JSON-LD builders and the sitemap can
 * use it without pulling in `next/root-params`, which is Server-Component-only.
 */
export const localePath = (locale: Locale, path: string): string => {
  if (isLocaleFreePath(path)) return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

/**
 * The public provider page, `/p/<key>`, is the one page route without a locale prefix: its
 * language is `?lang=`, the `NEXT_LOCALE` cookie or `Accept-Language`, resolved by the proxy,
 * so each provider has exactly one indexable URL. `localePath` — and so `AppLink` and every
 * absolute URL built on it — leaves it alone.
 *
 * Spelled as a literal rather than read from `ROUTES`: this module sits under the proxy and
 * the sitemap and must stay import-light. `tests/unit/i18n/pathname.spec.ts` pins it to
 * `ROUTES.providerPage`.
 */
export const PROVIDER_PAGE_PREFIX = '/p'

export const isLocaleFreePath = (path: string): boolean =>
  path === PROVIDER_PAGE_PREFIX || path.startsWith(`${PROVIDER_PAGE_PREFIX}/`)

export const splitLocaleFromPathname = (pathname: string): SplitPathname => {
  const [, maybeLocale, ...rest] = pathname.split('/')

  if (!isLocale(maybeLocale)) return { pathname }

  // '/es' -> '/', not '' — ROUTES.home is '/' and a bare '' matches nothing.
  return { locale: maybeLocale, pathname: `/${rest.join('/')}` }
}
