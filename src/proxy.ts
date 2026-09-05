import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { isLocale, LOCALE_COOKIE } from '@i18n/config'
import { matchAcceptLanguage } from '@i18n/matchAcceptLanguage'
import { splitLocaleFromPathname } from '@i18n/pathname'
import { routing } from '@i18n/routing'
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
 *    form that will fail on submit. The cookie is httpOnly, so this is the only place in
 *    the frontend that can see it at all.
 *
 * 3. **Hand off to next-intl**, which validates the prefix and keeps its locale cookie in
 *    step with the URL.
 */
const SESSION_COOKIE = 'bookie_session'

const PROTECTED_PREFIXES = [
  ROUTES.providerProfileCreation,
  ROUTES.providerServices,
  ROUTES.providerProfile,
  ROUTES.consumerProfile,
]

const handleI18nRouting = createMiddleware(routing)

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

export function proxy(request: NextRequest) {
  const { locale, pathname } = splitLocaleFromPathname(request.nextUrl.pathname)

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
    target.pathname = `/${locale}${ROUTES.phoneNumberInput}`
    return personalizedRedirect(target)
  }

  return handleI18nRouting(request)
}

/**
 * Every page route, since all of them now need a locale prefix. Skips Next's internals
 * and anything with a file extension, so static assets and the generated icon/OG images
 * are never redirected.
 *
 * `matcher` is a literal: Next statically analyses it at build time and cannot resolve an
 * imported constant. Matching broadly is also what lets `PROTECTED_PREFIXES` above be the
 * single source of truth for the guard — when the matcher listed the protected paths too,
 * the two lists had to be kept in step by hand.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
}
