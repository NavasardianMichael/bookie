import { type NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LOCALE, isLocale } from './config'
import { localePath } from './pathname'

type LocaleRouteContext = { params: Promise<{ lang: string }> }

/**
 * A `GET` Route Handler that sends a retired URL to `target`, in the caller's locale.
 *
 * **A Route Handler, never a `page.tsx` calling `redirect()`.** These URLs sit inside
 * layouts that stream before a page body runs, so a page's redirect arrives after the
 * response has begun and Next falls back to a client navigation: HTTP 200, no `Location`.
 * Same trap as `/p/<slug>` (`src/app/CLAUDE.md`).
 *
 * **307, never 308.** A permanent redirect is cached by the browser and would pin old
 * bookmarks even if the URL ever meant something again.
 *
 * `target` is a locale-free `ROUTES` path; `export const GET = localeRedirect(ROUTES.x)`.
 */
export const localeRedirect =
  (target: string) =>
  async (request: NextRequest, context: LocaleRouteContext): Promise<NextResponse> => {
    const { lang } = await context.params
    const locale = isLocale(lang) ? lang : DEFAULT_LOCALE

    return NextResponse.redirect(new URL(localePath(locale, target), request.nextUrl.origin), 307)
  }
