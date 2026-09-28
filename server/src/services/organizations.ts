import { asTrimmedString } from '../lib/request.js'
import { collapseWhitespace, isSameName, isSimilarName, rankBySearch } from '../lib/search.js'

/**
 * Validation, search and duplicate detection for organizations — kept out of the routes as
 * plain functions, like `providerSeo.ts`, so they are testable without a database or an
 * Express request.
 *
 * Mirrors `src/constants/form.ts` (`MAX_CHARS_FOR_ORGANIZATION_NAME`, `MAX_CHARS_FOR_ADDRESS`,
 * `MAX_CHARS_FOR_WEBSITE`, and `MAX_CHARS_FOR_TEXTAREA` for the description). Free text is
 * truncated at those figures rather than rejected.
 */
export const MAX_ORGANIZATION_NAME_LENGTH = 100
export const MAX_ORGANIZATION_DESCRIPTION_LENGTH = 300
export const MAX_ORGANIZATION_ADDRESS_LENGTH = 200
export const MAX_ORGANIZATION_WEBSITE_LENGTH = 200

/** `GET /organizations?q=` answers at most this many, and never more than a caller's `limit`. */
export const MAX_ORGANIZATION_SEARCH_RESULTS = 20

/** `GET /organizations/similar` — enough to recognise yours, few enough to read in a dialog. */
export const MAX_SIMILAR_ORGANIZATIONS = 3

/** The `Organization` columns a registration may write. All `NOT NULL DEFAULT ''`. */
export type NewOrganizationData = {
  name: string
  description: string
  country: string
  address: string
  phone: string
  website: string
}

export type NewOrganizationDraft = {
  data: NewOrganizationData
  /**
   * The provider was shown the organizations with a similar name and chose to create
   * theirs anyway, so the same-name backstop in `resolveOrganizationId` must not link one.
   */
  allowSimilar: boolean
}

type NamedOrganization = { id: string; name: string }

/** E.164 — the shape the web app normalizes to, and the one the seed stores. */
const E164 = /^\+[1-9]\d{6,14}$/

/**
 * One line of text as stored: trimmed on both sides, inner runs of whitespace collapsed to
 * one space, then capped — and trimmed again, so a cut never leaves a trailing space.
 */
const asCleanLine = (value: unknown, max: number): string =>
  typeof value === 'string' ? collapseWhitespace(value).slice(0, max).trimEnd() : ''

/** A paragraph keeps its line breaks, so only its ends are trimmed. */
const asCleanParagraph = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max).trimEnd() : ''

/**
 * `http(s)` only. The value is rendered as a link on the public organization page, so any
 * other scheme — `javascript:` above all — is dropped rather than stored.
 */
const asWebsite = (value: unknown): string => {
  const trimmed = asTrimmedString(value)
  if (!trimmed || trimmed.length > MAX_ORGANIZATION_WEBSITE_LENGTH) return ''
  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' || url.protocol === 'http:' ? trimmed : ''
  } catch {
    return ''
  }
}

/**
 * The `newOrganization` object of a registration body, or `undefined` when there is none or
 * it has no name — a name is the only thing an organization cannot exist without.
 *
 * `country` is the provider's, already parsed by the route: the organization takes the one
 * picked on the phone field, which is how `Organization.country` has always been filled.
 *
 * A malformed optional field is **dropped, not rejected** — the web form validates each one,
 * so a bad value here was sent by hand, and refusing the whole registration over an
 * organization's website would be out of proportion. The same call `asCountryCode` makes.
 */
export const parseNewOrganization = (value: unknown, country: string | undefined): NewOrganizationDraft | undefined => {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>

  const name = asCleanLine(raw.name, MAX_ORGANIZATION_NAME_LENGTH)
  if (!name) return undefined

  const phone = asTrimmedString(raw.phone)

  return {
    data: {
      name,
      description: asCleanParagraph(raw.description, MAX_ORGANIZATION_DESCRIPTION_LENGTH),
      country: country ?? '',
      address: asCleanLine(raw.address, MAX_ORGANIZATION_ADDRESS_LENGTH),
      phone: phone && E164.test(phone) ? phone : '',
      website: asWebsite(raw.website),
    },
    allowSimilar: raw.allowSimilar === true,
  }
}

/**
 * `?limit=` for the organization search: an integer from 1 to the cap, else the cap. The
 * registration field asks for five; a caller that sends nothing keeps the old twenty.
 */
export const parseSearchLimit = (value: unknown): number => {
  const limit = typeof value === 'string' ? Number(value) : NaN
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_ORGANIZATION_SEARCH_RESULTS
    ? limit
    : MAX_ORGANIZATION_SEARCH_RESULTS
}

/**
 * The search's order: exact name, then prefix, word start, substring, and finally every
 * word matched by prefix or a typo in any order (`lib/search.ts#matchScore`). Equal scores
 * keep the input's alphabetical order.
 */
export const rankOrganizations = <T extends NamedOrganization>(organizations: readonly T[], query: string, limit: number): T[] =>
  rankBySearch(organizations, (organization) => organization.name, query).slice(0, limit)

/**
 * The organizations a new one called `name` would probably duplicate — the same name first,
 * then near misses (`isSimilarName`). What the registration form asks about before it
 * creates anything.
 */
export const findSimilarOrganizations = <T extends NamedOrganization>(organizations: readonly T[], name: string): T[] =>
  organizations
    .filter((organization) => isSimilarName(organization.name, name))
    .sort((left, right) => Number(isSameName(right.name, name)) - Number(isSameName(left.name, name)))
    .slice(0, MAX_SIMILAR_ORGANIZATIONS)

/**
 * The organization a new one called `name` **is** — the same name however it is cased,
 * spaced or punctuated. Strict, because the registration backstop links it silently.
 */
export const findSameNamedOrganization = <T extends NamedOrganization>(organizations: readonly T[], name: string): T | undefined =>
  organizations.find((organization) => isSameName(organization.name, name))
