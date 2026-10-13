import type { Prisma } from '@prisma/client'
import { matchedServicesByProvider, rankByRelevance, shouldRankByRelevance } from './providerRelevance.js'
import { matchedServicesWhere, type ProvidersListQuery } from './providerSearch.js'
import { prisma } from '../lib/prisma.js'
import type { TermSpellings } from '../lib/searchCorrection.js'
import { providerListInclude } from '../mappers/entities.js'

/**
 * The reads behind one page of Explore, once `GET /providers` has counted it: which
 * providers, in what order, and which of their services the search was about.
 */

export type ExploreProviderRow = Prisma.ProviderGetPayload<{ include: typeof providerListInclude }>

/** What `rankByRelevance` reads — names, and only the services the search matched. */
const relevanceSelect = (matched: readonly TermSpellings[]) =>
  ({
    id: true,
    firstName: true,
    lastName: true,
    available: true,
    ratingScore: true,
    updatedAt: true,
    organization: { select: { name: true } },
    services: { where: matchedServicesWhere(matched), select: { name: true } },
    categories: { select: { category: { select: { name: true } } } },
  }) satisfies Prisma.ProviderSelect

/**
 * The page, in `query`'s order — or, for a typed query under `recommended`, ranked by how
 * well each provider matches (`services/providerRelevance.ts`). Ranking reads every match,
 * so it runs only up to `RELEVANCE_RANK_LIMIT`; `total` is the count the caller already has.
 */
export const loadExplorePage = async (
  query: ProvidersListQuery,
  total: number,
  skip: number
): Promise<ExploreProviderRow[]> => {
  const { where, orderBy, perPage, matched } = query
  if (!shouldRankByRelevance(query, total)) {
    return prisma.provider.findMany({ where, include: providerListInclude, orderBy, skip, take: perPage })
  }

  const candidates = await prisma.provider.findMany({ where, select: relevanceSelect(matched) })
  const pageIds = rankByRelevance(candidates, matched)
    .slice(skip, skip + perPage)
    .map((candidate) => candidate.id)
  const rows = await prisma.provider.findMany({ where: { id: { in: pageIds } }, include: providerListInclude })

  const byId = new Map(rows.map((row) => [row.id, row]))
  return pageIds.flatMap((id) => byId.get(id) ?? [])
}

const matchedServiceSelect = {
  id: true,
  providerId: true,
  name: true,
  durationMinutes: true,
  price: true,
  currency: true,
} satisfies Prisma.ServiceSelect

export type MatchedServiceRow = Prisma.ServiceGetPayload<{ select: typeof matchedServiceSelect }>

/**
 * Per provider on the page, the service its card names as the match and how many more
 * matched. One query for the whole page, and none without a typed query — a provider found
 * only by name gets no entry, so its card stays as it is.
 */
export const loadMatchedServices = async (
  providerIds: readonly string[],
  matched: readonly TermSpellings[]
): Promise<Map<string, { service: MatchedServiceRow; more: number }>> => {
  if (!providerIds.length || !matched.length) return new Map()

  const services = await prisma.service.findMany({
    where: { providerId: { in: [...providerIds] }, ...matchedServicesWhere(matched) },
    select: matchedServiceSelect,
    orderBy: { name: 'asc' },
  })
  return matchedServicesByProvider(services, matched)
}
