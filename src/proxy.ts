import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { isLocale, LANG_PARAM, type Locale, LOCALE_COOKIE } from '@i18n/config'
import { matchAcceptLanguage } from '@i18n/matchAcceptLanguage'
import { isLocaleFreePath, splitLocaleFromPathname } from '@i18n/pathname'
import { routing } from '@i18n/routing'
import { SESSION_COOKIE } from '@constants/auth'
import { ROUTES } from '@constants/routes'

/**
 * Next 16 renamed Middleware to Proxy; the file must sit beside `app/`, hence `src/proxy.ts`
 * (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
 *
 * Three jobs, in order:
 *
 * 1. **Send unprefixed traffic to a locale.** Every route lives under `app/[lang]`, so
 *    `/providers` has to become `/en/providers` before it can render. The locale is picked
 *    here rather than by next-intl because its negotiation loses users — see
 *    `routing.ts` for the measured cases.
 *
 * 2. **Optimistic route guard** for the signed-in areas. This checks only that a session
 *    cookie is *present* — it cannot verify the JWT, because the signing secret belongs to
 *    the API and Next's own docs are explicit that Proxy is not a session-management or
 *    authorization layer. Real enforcement stays server-side in `requireAuth` /
 *    `requireProvider` / `requireConsumer`, which every protected endpoint already runs;
 *    this exists so a signed-out visitor sees the sign-in screen instead of an onboarding
 *    form that will fail on submit. The cookie is httpOnly, so no client code can see it —
 *    only this and Server Components (the landing page, to hide its sign-up buttons).
 *
 *    **This runs on the web host, and the cookie is minted by the API on another one** —
 *    `bookie.<domain>` vs `api.bookie.<domain>` in production, both `localhost` in dev.
 *    A host-only cookie is therefore invisible here in production and only there, which
 *    turned this guard into an infinite bounce to sign-in for users who *were* signed in.
 *    The API sets `Domain` to the web host (`config.cookieDomain`, defaulted from
 *    `CORS_ORIGIN`) so both hosts see it — see `server/CLAUDE.md`. Anything added here
 *    that reads a cookie set by the API depends on that.
 *
 * 3. **Hand off to next-intl**, which validates the prefix and keeps its locale cookie in
 *    step with the URL.
 *
 * Before all three, the public provider page: `/p/<key>` is the one page route **without** a
 * locale segment, so each provider has a single indexable URL (`docs/routes/provider-page.md`).
 * See `providerPage` below.
 */
const PROTECTED_PREFIXES = [
  ROUTES.providerServices,
  ROUTES.providerProfile,
  ROUTES.consumerProfile,
  ROUTES.bookings,
  ROUTES.favorites,
  // Not `billingCheckout`: Paddle links there from its own emails, signed in or not.
  ROUTES.billingReturn,
]

const handleI18nRouting = createMiddleware(routing)

/**
 * App-root metadata files (`icon.tsx`, `icon-maskable/route.tsx`, `apple-icon.tsx`,
 * `opengraph-image.tsx`) are served at these paths with no file extension, so the
 * matcher cannot skip them. Without this list `/icon` is treated as an unprefixed
 * page and 307s to `/en/icon`, which is not a document — the browser then 404s the
 * favicon and the manifest's icon download fails.
 */
const LOCALE_AGNOSTIC_METADATA = new Set([
  '/icon',
  '/icon-maskable',
  '/apple-icon',
  '/opengraph-image',
  '/twitter-image',
])

/** Cookie first — an explicit choice outranks the browser's header. */
const negotiateLocale = (request: NextRequest) => {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(chosen)) return chosen

  return matchAcceptLanguage(request.headers.get('accept-language'))
}

/**
 * A redirect whose *target depends on who is asking* — the visitor's cookie and
 * `Accept-Language`, or whether they hold a session.
 *
 * Without these headers a shared cache (the CDN in front of the app, a corporate
 * proxy) is entitled to store the first visitor's redirect under the bare URL and
 * replay it for everyone: one Spanish visitor hitting `/providers` would send
 * every later visitor to `/es/providers`. It never reproduces in local dev,
 * because there is no shared cache in front of `next dev`.
 *
 * `Vary` states the dependency; `no-store` is the belt to that braces, since
 * `Vary: Cookie` is handled inconsistently by CDNs and the hit rate on a
 * per-cookie key would be ~zero anyway.
 *
 * The status stays **307, never 308**: a permanent redirect is cached by the
 * browser itself, which would pin a visitor to the first language they ever
 * negotiated and quietly outlive the language switcher.
 */
const personalizedRedirect = (target: URL) => {
  const response = NextResponse.redirect(target)

  response.headers.set('Vary', 'Accept-Language, Cookie')
  response.headers.set('Cache-Control', 'no-store')

  return response
}

/**
 * The public provider page.
 *
 * - **`/p/<key>`** is *rewritten*, not redirected, to `/<locale>/p/<key>`: the address bar
 *   keeps the one canonical URL while the app renders under its `[lang]` root. The language
 *   is `?lang=` when it names one of ours, else the cookie, else `Accept-Language`, and
 *   `Content-Language` says which it picked. Crawlers send neither, so the indexed copy is the
 *   default locale's. No `Vary` is set: Next replaces it on page responses, and the page is
 *   served `no-cache, must-revalidate`, so a shared cache asks the origin every time anyway.
 * - **`/<lang>/p/<key>`** — the old vanity links, or anything that prefixed the path — is a
 *   **308** to the bare URL with `?lang=<lang>`: permanent, because the move is, and so a
 *   search engine carries the old URL's standing over. It never loops: a rewrite's target
 *   does not pass through the proxy again.
 */
const providerPage = (request: NextRequest, locale: Locale | undefined, pathname: string) => {
  if (locale) {
    const target = request.nextUrl.clone()
    target.pathname = pathname
    target.searchParams.set(LANG_PARAM, locale)
    return NextResponse.redirect(target, 308)
  }

  const requested = request.nextUrl.searchParams.get(LANG_PARAM)
  const resolved = isLocale(requested) ? requested : negotiateLocale(request)
  const target = request.nextUrl.clone()
  target.pathname = `/${resolved}${pathname}`

  const response = NextResponse.rewrite(target)
  response.headers.set('Content-Language', resolved)
  return response
}

export function proxy(request: NextRequest) {
  const { locale, pathname } = splitLocaleFromPathname(request.nextUrl.pathname)

  if (isLocaleFreePath(pathname)) return providerPage(request, locale, pathname)

  if (LOCALE_AGNOSTIC_METADATA.has(pathname)) {
    if (!locale) return NextResponse.next()

    const target = request.nextUrl.clone()
    target.pathname = pathname
    return NextResponse.rewrite(target)
  }

  if (!locale) {
    const target = request.nextUrl.clone()
    // ROUTES.home is '/', so a bare redirect target would be '/en/' — harmless but
    // it costs a second redirect to the canonical '/en'.
    target.pathname = pathname === '/' ? `/${negotiateLocale(request)}` : `/${negotiateLocale(request)}${pathname}`
    return personalizedRedirect(target)
  }

  // Guarding the locale-stripped path keeps PROTECTED_PREFIXES comparable to ROUTES,
  // which never carries a locale segment.
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (isProtected && !request.cookies.get(SESSION_COOKIE)) {
    const target = request.nextUrl.clone()
    target.pathname = `/${locale}${ROUTES.signIn}`
    return personalizedRedirect(target)
  }

  return handleI18nRouting(request)
}

/**
 * Every page route, since all of them now need a locale prefix. Skips Next's internals
 * and anything with a file extension (`favicon.ico`, `/manifest.webmanifest`, `/sw.js`,
 * static assets). Generated metadata images have no extension, so they still enter this
 * function and are passed through by `LOCALE_AGNOSTIC_METADATA` rather than prefixed.
 *
 * `matcher` is a literal: Next statically analyses it at build time and cannot resolve an
 * imported constant. Matching broadly is also what lets `PROTECTED_PREFIXES` above be the
 * single source of truth for the guard — when the matcher listed the protected paths too,
 * the two lists had to be kept in step by hand.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
}
