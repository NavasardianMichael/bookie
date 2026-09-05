import type { Metadata } from 'next'
import { lang } from 'next/root-params'
import { DEFAULT_LOCALE, isLocale, type Locale,LOCALES } from './config'
import { localePath } from './pathname'

/** The locale of the page being rendered, from the `[lang]` root segment. */
export const currentLocale = async (): Promise<Locale> => {
  const segment = await lang()
  return isLocale(segment) ? segment : DEFAULT_LOCALE
}

type AlternatesOptions = {
  /**
   * Which locale `hreflang="x-default"` points at — the version a crawler should
   * show when it cannot match any language. Defaults to English.
   *
   * Provider profile pages override this with the provider's own chosen language
   * (Phase 4), which is what makes "his pages are shown in the language he
   * selected" true for a shared link while all 15 stay independently indexable.
   */
  xDefault?: Locale
}

/**
 * `alternates` for a page, given its **locale-free** path.
 *
 * Every locale variant is **self-canonical** — `/es/providers` canonicals to
 * itself, not to `/en/providers`. Pointing all 15 at one canonical would tell
 * Google the other 14 are duplicates and deindex them, which is the opposite of
 * the reason the locale is in the URL at all. `hreflang` is the tag that says
 * "same page, different language"; canonical is not.
 *
 * Paths stay root-relative: `metadataBase` in the root layout resolves them to
 * absolute URLs, which is what Google requires of `hreflang`.
 */
/**
 * `alternates` for a page whose **substance is user-authored and identical in
 * every locale** — a provider's profile, where only the surrounding chrome is
 * translated while their name, services and descriptions stay as they wrote them.
 *
 * All 15 URLs still render and stay reachable; they simply consolidate onto one
 * canonical instead of asking to be indexed separately. Fifteen index entries per
 * provider that differ only in button labels multiply crawl budget by 15 and add
 * nothing a searcher would ever want — nobody searches for a provider's name and
 * needs the Thai-chrome version of it.
 *
 * **This deliberately emits no `hreflang`**, and that is not an oversight. A
 * cross-canonical and an `hreflang` set contradict each other: `hreflang` says
 * "index these as language variants of each other", the canonical says "index
 * only this one". Google resolves the conflict by ignoring the `hreflang`, so
 * emitting both would be noise at best. Use `localizedAlternates` for pages whose
 * copy really is translated — the landing page, the lists, the category pages.
 */
export const consolidatedAlternates = async (
  path: string,
  canonicalLocale: Locale
): Promise<Metadata['alternates']> => ({
  canonical: localePath(canonicalLocale, path),
})

export const localizedAlternates = async (path: string, options: AlternatesOptions = {}): Promise<Metadata['alternates']> => {
  const locale = await currentLocale()

  const languages = Object.fromEntries(LOCALES.map((each) => [each, localePath(each, path)]))

  return {
    canonical: localePath(locale, path),
    languages: {
      ...languages,
      'x-default': localePath(options.xDefault ?? DEFAULT_LOCALE, path),
    },
  }
}
