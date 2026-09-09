import { type NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LOCALE, isLocale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'

/**
 * The vanity link: `/p/<slug>` sends the visitor to the provider's profile.
 *
 * **A Route Handler, not a `page.tsx`, and that is the whole point.** As a page this
 * emitted a *soft* redirect: the root layout streams first, so by the time `redirect()`
 * threw, the response had already begun and Next fell back to a client-side navigation —
 * HTTP 200, an empty shell, and no `Location` header. That renders fine in a browser and
 * is useless to a crawler, which is the one audience a shareable link has. A handler
 * returns a real `Response` before anything renders.
 *
 * **307, never 308.** A permanent redirect is cached by the browser itself, so it would
 * outlive a slug change: a provider who renamed their link would keep sending returning
 * visitors to the old target out of their own cache, with nothing on our side able to
 * correct it. Same reasoning as `personalizedRedirect` in `src/proxy.ts`.
 *
 * **No database round-trip, because it does not need one.** `GET /providers/:idOrSlug`
 * accepts either form, so `/providers/<slug>` renders the provider's page directly. That
 * makes this a pure URL rewrite: one hop instead of two, no API call that could fail or
 * be slow, and an unknown slug 404s through the detail page's own `notFound()` with the
 * app's real not-found UI rather than a bare handler response.
 *
 * It does not create a duplicate document either. `generateMetadata` on the detail page
 * builds its canonical from the **resolved entity's id**, so `/providers/<slug>` and
 * `/providers/<uuid>` both canonical to the id URL and only one is ever indexed. The
 * memorable form stays in the address bar, which is what a vanity link is for.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await context.params

  // The segment is whatever is in the URL; nothing at the type level says it is one of
  // ours, and an unknown value must not reach `localePath`.
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE

  const target = new URL(
    localePath(locale, `${ROUTES.providers}/${encodeURIComponent(slug)}`),
    request.nextUrl.origin
  )

  return NextResponse.redirect(target, 307)
}
