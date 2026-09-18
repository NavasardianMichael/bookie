import { type NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LOCALE, isLocale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'

/**
 * History was renamed to Bookings. A Route Handler, not a `page.tsx`, because this
 * segment sits inside the account layout: a page's `redirect()` would run after that
 * layout has already started streaming, and Next would fall back to a client
 * navigation — HTTP 200, no `Location` header. Same trap as `/p/<slug>`.
 *
 * **307, never 308.** A permanent redirect is cached by the browser and would pin
 * old bookmarks even if this URL ever meant something else again.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ lang: string }> }) {
  const { lang } = await context.params
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE

  const target = new URL(localePath(locale, ROUTES.providerProfileBookings), request.nextUrl.origin)
  return NextResponse.redirect(target, 307)
}
