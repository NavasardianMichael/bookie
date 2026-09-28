import { PUBLIC_PROVIDER_WHERE } from './providerSearch.js'
import { prisma } from '../lib/prisma.js'
import {
  buildSearchVocabulary,
  correctSearchTerms,
  type SearchVocabulary,
  type TermSpellings,
} from '../lib/searchCorrection.js'

/**
 * Counts a searched list; when the search found nothing, widens each unknown word to its
 * closest known spellings (`lib/searchCorrection.ts`) and counts once more. Returns
 * whichever parsed query produced the total, so the page read that follows uses the same
 * one. `parse` builds the query from the request, or from those spellings when given them.
 *
 * The vocabulary is loaded only on that empty-result path, so a search that matches pays
 * nothing for the tolerance.
 */
export const countWithCorrection = async <TQuery extends { terms: string[] }>(
  parse: (spellings?: readonly TermSpellings[]) => TQuery,
  count: (query: TQuery) => Promise<number>,
  loadVocabulary: () => Promise<SearchVocabulary>
): Promise<{ query: TQuery; total: number }> => {
  const query = parse()
  const total = await count(query)
  if (total || !query.terms.length) return { query, total }

  const corrected = correctSearchTerms(query.terms, await loadVocabulary())
  if (!corrected) return { query, total }

  const retried = parse(corrected)
  return { query: retried, total: await count(retried) }
}

/** Long enough that a burst of misspelled searches shares one load, short enough to learn new names. */
const EXPLORE_VOCABULARY_TTL_MS = 60_000

let exploreVocabulary: { loadedAt: number; vocabulary: SearchVocabulary } | null = null

/**
 * Every word Explore can match: listed providers' names and organizations, their active
 * services, and category names — the same fields `providerSearch.ts#matchesTerm` searches.
 * Cached per process; the list is public, so one copy serves every visitor.
 */
export const loadExploreVocabulary = async (): Promise<SearchVocabulary> => {
  if (exploreVocabulary && Date.now() - exploreVocabulary.loadedAt < EXPLORE_VOCABULARY_TTL_MS) {
    return exploreVocabulary.vocabulary
  }

  const [providers, services, categories] = await Promise.all([
    prisma.provider.findMany({
      where: PUBLIC_PROVIDER_WHERE,
      select: { firstName: true, lastName: true, organization: { select: { name: true } } },
    }),
    prisma.service.findMany({
      where: { active: true, provider: PUBLIC_PROVIDER_WHERE },
      select: { name: true },
      distinct: ['name'],
    }),
    prisma.category.findMany({ select: { name: true } }),
  ])

  const vocabulary = buildSearchVocabulary([
    ...providers.flatMap((provider) => [provider.firstName, provider.lastName, provider.organization?.name]),
    ...services.map((service) => service.name),
    ...categories.map((category) => category.name),
  ])
  exploreVocabulary = { loadedAt: Date.now(), vocabulary }
  return vocabulary
}

/** A calendar's older rows add few new names; the cap bounds a long-lived provider's load. */
const BOOKINGS_VOCABULARY_ROWS = 2000

/**
 * The words one provider's bookings can match — who booked, under either identity, and
 * the service — the fields `providerBookings.ts#matchesTerm` searches, less the guest email.
 * Scoped by the session's provider id, so it can never reveal another calendar's names.
 */
export const loadProviderBookingsVocabulary = async (providerId: string): Promise<SearchVocabulary> => {
  const rows = await prisma.appointment.findMany({
    where: { providerId },
    select: {
      guestFirstName: true,
      guestLastName: true,
      consumer: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
    orderBy: { startAt: 'desc' },
    take: BOOKINGS_VOCABULARY_ROWS,
  })

  return buildSearchVocabulary(
    rows.flatMap((row) => [
      row.guestFirstName,
      row.guestLastName,
      row.consumer?.firstName,
      row.consumer?.lastName,
      row.service?.name,
    ])
  )
}

/** The other side of the same list: the providers this consumer booked, and the services. */
export const loadConsumerBookingsVocabulary = async (consumerId: string): Promise<SearchVocabulary> => {
  const rows = await prisma.appointment.findMany({
    where: { consumerId },
    select: {
      provider: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
    orderBy: { startAt: 'desc' },
    take: BOOKINGS_VOCABULARY_ROWS,
  })

  return buildSearchVocabulary(
    rows.flatMap((row) => [row.provider?.firstName, row.provider?.lastName, row.service?.name])
  )
}
