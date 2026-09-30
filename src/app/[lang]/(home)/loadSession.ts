import { cookies } from 'next/headers'
import { getMeAPI } from '@api/auth/main'
import { Session } from '@interfaces/auth'
import { SESSION_COOKIE } from '@constants/auth'
import { classifyError } from '@helpers/error'
import { reportError } from '@helpers/reportError'

/**
 * The visitor's session, or `null` for a guest — read on the server so the landing hero
 * paints the right buttons in the document instead of swapping them after hydration.
 *
 * No cookie means no session, and answering that here spares guests — most of this page's
 * traffic, crawlers included — an API round-trip. A present cookie is only a claim, so it
 * is checked with `GET /identity/me`.
 *
 * Never throws: the landing page renders for everyone, so an outage answers `null` (the
 * guest view) and is reported rather than shown.
 */
export const loadSession = async (): Promise<Session | null> => {
  const cookieStore = await cookies()
  if (!cookieStore.has(SESSION_COOKIE)) return null

  try {
    return await getMeAPI({ cookie: cookieStore.toString() })
  } catch (error) {
    // An expired or revoked cookie is a guest, not a fault — the split the auth store's `getMe` makes.
    if (classifyError(error).kind !== 'unauthorized') reportError(error, 'home:session')
    return null
  }
}
