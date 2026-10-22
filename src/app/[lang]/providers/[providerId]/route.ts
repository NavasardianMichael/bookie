import { type NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LOCALE, isLocale, LANG_PARAM } from '@i18n/config'
import { ROUTES } from '@constants/routes'

/**
 * The provider page's old address, `/<lang>/providers/<id|slug>`. The page is now
 * `/p/<key>` (`docs/routes/provider-page.md`), so every link, bookmark and indexed URL to the
 * old one is sent there **permanently** — a 308 is what tells a search engine to move the
 * page's ranking to the new address. The language rides along as `?lang=`.
 *
 * No database round-trip: the segment is already a key `/p/` resolves (an id, or a slug —
 * current or given up). The static siblings (`profile`, `profile-services`) are matched before
 * this dynamic segment, so they never reach it.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ lang: string; providerId: string }> }) {
  const { lang, providerId } = await context.params
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE

  const target = new URL(`${ROUTES.providerPage}/${encodeURIComponent(providerId)}`, request.nextUrl.origin)
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value))
  target.searchParams.set(LANG_PARAM, locale)

  return NextResponse.redirect(target, 308)
}
