import type { ProvidersListQuery } from './providerSearch.js'
import { categoryLabels, SEEDED_CATEGORY_NAMES } from '../lib/category-names.js'
import { normalizeSearchText, toSearchWords } from '../lib/search.js'
import type { TermSpellings } from '../lib/searchCorrection.js'

/**
 * Explore's `recommended` order when the visitor typed something: providers whose match is
 * better rank above ones that merely contain the word somewhere.
 *
 * Prisma cannot order by a score computed here, so the route loads every match, ranks it,
 * and reads only the page it keeps — the approach `services/organizations.ts` takes. That is
 * a few milliseconds and about a megabyte per request at the cap; past it the plain order is
 * used. The next step, when listed providers outgrow it, is a score in SQL (`docs/BACKLOG.md`).
 *
 * Pure: no Prisma client, no config — `tests/unit/server/providerRelevance.spec.ts` reaches it.
 */

/** Above this many matches the plain `recommended` order is kept rather than ranking in memory. */
export const RELEVANCE_RANK_LIMIT = 300

/** A service name or category label outranks a person's name matched as well — never one matched better. */
const OFFER_BONUS = 0.5

/** The match quality of a text that does not contain the term at all. */
const NO_MATCH = 0

/** A field normalized once: its words, rejoined with single spaces. */
type SearchField = string

const toField = (text: string): SearchField => toSearchWords(text).join(' ')

/** Seeded categories carry sixteen labels each; normalize them once, not per request. */
const SEEDED_CATEGORY_FIELDS = new Map<string, SearchField[]>(
  SEEDED_CATEGORY_NAMES.map((name) => [name, categoryLabels(name).map(toField)])
)

const categoryFields = (name: string): SearchField[] => SEEDED_CATEGORY_FIELDS.get(name) ?? [toField(name)]

/**
 * How well one normalized term matches one field, word by word:
 *
 * | 4 | the whole field | 3 | a whole word of it | 2 | the start of a word | 1 | inside a word |
 *
 * Word by word because `matchScore` judges whole strings: it would put the surname
 * "Massagetti" (the field starts with the term) above the service "Thai massage" (a word
 * equals it). A term may itself hold several words ("hair-cut" normalizes to "hair cut").
 */
export const termQuality = (field: SearchField, needle: string): number => {
  if (!needle || !field) return NO_MATCH
  if (field === needle) return 4
  if (` ${field} `.includes(` ${needle} `)) return 3
  if (` ${field}`.includes(` ${needle}`)) return 2
  if (field.includes(needle)) return 1
  return NO_MATCH
}

const bestQuality = (fields: readonly SearchField[], needle: string): number =>
  fields.reduce((best, field) => Math.max(best, termQuality(field, needle)), NO_MATCH)

const toNeedles = (matched: readonly TermSpellings[]): string[][] =>
  matched.map((spellings) => spellings.map(normalizeSearchText).filter(Boolean))

/** What `rankByRelevance` reads off a provider — the route's narrow `select`. */
export type RelevanceCandidate = {
  id: string
  fullName: string
  available: boolean
  ratingScore: number
  updatedAt: Date
  organization: { name: string } | null
  /** Only the services `matchedServicesWhere` let through. */
  services: { name: string }[]
  categories: { category: { name: string } }[]
}

/**
 * The sum over the query's words of each word's best match on this provider. Every word
 * scores at least 1: the database already matched it, and only normalization — which
 * `ILIKE` does not do — can make it look absent here.
 */
const relevanceOf = (candidate: RelevanceCandidate, needles: readonly string[][]): number => {
  const personFields = [candidate.fullName, candidate.organization?.name ?? ''].map(toField)
  const offerFields = [
    ...candidate.services.map((service) => toField(service.name)),
    ...candidate.categories.flatMap(({ category }) => categoryFields(category.name)),
  ]

  return needles.reduce((sum, spellings) => {
    const best = spellings.reduce((wordBest, needle) => {
      const offer = bestQuality(offerFields, needle)
      const person = bestQuality(personFields, needle)
      return Math.max(wordBest, offer ? offer + OFFER_BONUS : NO_MATCH, person)
    }, NO_MATCH)
    return sum + Math.max(1, best)
  }, 0)
}

/**
 * `recommended` with relevance as its second key: bookable first, as without a query — a
 * provider who paused bookings is not a recommendation however well they match — then the
 * better match, then the rating, then the freshest edit.
 */
export const rankByRelevance = <T extends RelevanceCandidate>(
  candidates: readonly T[],
  matched: readonly TermSpellings[]
): T[] => {
  const needles = toNeedles(matched)
  return candidates
    .map((candidate) => ({ candidate, relevance: relevanceOf(candidate, needles) }))
    .sort(
      (left, right) =>
        Number(right.candidate.available) - Number(left.candidate.available) ||
        right.relevance - left.relevance ||
        right.candidate.ratingScore - left.candidate.ratingScore ||
        right.candidate.updatedAt.getTime() - left.candidate.updatedAt.getTime()
    )
    .map(({ candidate }) => candidate)
}

/** Only a typed query under the default sort is ranked, and only while it stays cheap. */
export const shouldRankByRelevance = (query: Pick<ProvidersListQuery, 'terms' | 'sort'>, total: number): boolean =>
  query.terms.length > 0 && query.sort === 'recommended' && total > 1 && total <= RELEVANCE_RANK_LIMIT

/**
 * The service a result card names as the match: the one whose name matches a query word
 * best. Every service passed in already matched by name (`matchedServicesWhere`), so this
 * only orders them; equal ones keep their input order.
 */
export const pickMatchedService = <T extends { name: string }>(
  services: readonly T[],
  matched: readonly TermSpellings[]
): T | undefined => {
  const needles = toNeedles(matched).flat()
  let best: { service: T; quality: number } | undefined

  for (const service of services) {
    const name = toField(service.name)
    const quality = needles.reduce((top, needle) => Math.max(top, termQuality(name, needle)), NO_MATCH)
    if (!best || quality > best.quality) best = { service, quality }
  }

  return best?.service
}

/**
 * One page's matched services, grouped per provider: the one to name on the card, and how
 * many others matched too — the card's "+N more".
 */
export const matchedServicesByProvider = <T extends { providerId: string; name: string }>(
  services: readonly T[],
  matched: readonly TermSpellings[]
): Map<string, { service: T; more: number }> => {
  const groups = new Map<string, T[]>()
  services.forEach((service) => groups.set(service.providerId, [...(groups.get(service.providerId) ?? []), service]))

  const matches = new Map<string, { service: T; more: number }>()
  groups.forEach((group, providerId) => {
    const service = pickMatchedService(group, matched)
    if (service) matches.set(providerId, { service, more: group.length - 1 })
  })
  return matches
}
