/**
 * Renders a stored country in the reader's language.
 *
 * Countries are stored as ISO 3166-1 alpha-2 (`AM`, `DE`) precisely so they can be
 * displayed in any locale — `Intl.DisplayNames` turns one stored `DE` into Germany,
 * Deutschland, ألمانيا or ドイツ. Storing the English name instead would have pinned every
 * provider's country to English no matter what language the page is in.
 *
 * **Degrades rather than throws.** Rows written before the column was standardised hold a
 * display name (`'Armenia'`), so anything that is not a two-letter code is passed through
 * unchanged. That keeps legacy data readable instead of rendering it as a blank or a
 * mangled code, and it means this is safe to call on any country column.
 */
export const getCountryName = (country: string | null | undefined, locale: string): string | undefined => {
  const value = country?.trim()
  if (!value) return undefined

  if (!/^[A-Za-z]{2}$/.test(value)) return value

  const code = value.toUpperCase()

  try {
    // `of()` returns the input unchanged for a well-formed but unassigned code, which is
    // the same graceful outcome as the passthrough above.
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    // An unsupported locale is the only realistic throw. The code is still better than
    // nothing, and this must never take a profile page down.
    return code
  }
}
