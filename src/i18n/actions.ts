'use server'

import { cookies } from 'next/headers'
import { isLocale, type Locale,LOCALE_COOKIE } from './config'

/** A year. The choice is a preference, not a session — it should outlive the tab. */
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Persists an explicit language choice.
 *
 * The cookie is step 3 of `resolveLocale`'s chain, so this takes effect on the
 * next server render — the caller is expected to `router.refresh()`. It is not
 * `httpOnly`: nothing here is a secret, and a future client-side read is
 * legitimate. `sameSite: 'lax'` keeps it on top-level navigations without
 * exposing it to cross-site requests.
 *
 * Once accounts carry a `locale` column (Phase 4) this also writes it through to
 * the signed-in user, so the choice follows them across devices; the cookie stays
 * as the signed-out carrier and the first-render mirror.
 *
 * Validates rather than trusting its argument: this is a server entry point that
 * anything on the network can call, and an unchecked value would flow straight
 * into a dynamic `import()` in `request.ts`.
 */
export const setLocale = async (locale: Locale): Promise<void> => {
  if (!isLocale(locale)) return

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  })
}
