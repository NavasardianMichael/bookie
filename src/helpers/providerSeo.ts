import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'

/**
 * The public provider page's title and description when the provider set no override on the
 * SEO tab. Composed from the profile, so they follow it: a new service or category changes
 * them, and the sitemap's `lastmod` moves with it (`server/src/services/providerSeoStamp.ts`).
 *
 * Shared by `generateMetadata` on the page and the SEO tab's preview, which must agree on
 * what search sees. Pure: every name arrives already translated.
 */

const join = (parts: readonly (string | null | undefined)[], separator: string): string =>
  parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(separator)

/**
 * `Name | Categories | Organization | Country`.
 *
 * Who, what, with whom, where — the order searches are typed in. The country is here because
 * "<service> <country>" queries match on title words; the address is free text of any
 * length, so it goes in the description and the page body instead. Not truncated: Google
 * shortens the *display*, and every word still counts toward matching.
 */
export const composeProviderTitle = ({
  name,
  categories,
  organization,
  country,
}: {
  name: string
  categories: readonly string[]
  organization?: string
  country?: string
}): string => join([name, join(categories, ', '), organization, country], ' | ')

/**
 * `text` cut to `max` characters at a word boundary, with an ellipsis when anything was cut.
 * A cut that would lose more than a third of the budget to find a space takes the hard cut.
 */
export const trimAtWord = (text: string, max: number): string => {
  const chars = [...text]
  if (chars.length <= max) return text
  const cut = chars.slice(0, max - 1).join('')
  const space = cut.lastIndexOf(' ')
  const kept = space > 0 && cut.length - space <= max / 3 ? cut.slice(0, space) : cut
  return `${kept.replace(/[\s|,.;:–-]+$/u, '')}…`
}

/** A sentence's closing mark in any of our scripts — `.`, `。`, Armenian `։`, `!`, `?`, `؟`. */
const CLOSING_MARK = /[.。։!?！？؟]+$/u

/**
 * `Book an appointment with Name | Categories | Services | Address, Country.`, at most
 * `MAX_CHARS_FOR_TEXTAREA` (300) characters.
 *
 * The intro is `Provider.fallbackDescription` in the reader's language; its own closing mark
 * moves to the end of the whole line, so an Armenian description ends in `։` and a Chinese one
 * in `。`. The organization is left out — it is in the title. The country is dropped when the
 * address already names it.
 */
export const composeProviderDescription = ({
  categories,
  services,
  intro,
  address,
  country,
}: {
  categories: readonly string[]
  services: readonly string[]
  /** `Provider.fallbackDescription` — "Book an appointment with {name}." in the reader's language. */
  intro: string
  address?: string
  country?: string
}): string => {
  const namesCountry = !!country && !!address && address.toLocaleLowerCase().includes(country.toLocaleLowerCase())
  const location = join([address, namesCountry ? undefined : country], ', ')
  const lead = intro.trim()
  // Thai writes no closing mark, so neither does its description.
  const closing = CLOSING_MARK.exec(lead)?.[0] ?? ''
  const line = join([lead.replace(CLOSING_MARK, ''), join(categories, ', '), join(services, ', '), location], ' | ')
  return trimAtWord(`${line}${closing}`, MAX_CHARS_FOR_TEXTAREA)
}
