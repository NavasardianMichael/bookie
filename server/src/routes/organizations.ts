import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { collapseWhitespace } from '../lib/search.js'
import { mapBasicOrganization, mapOrganization } from '../mappers/entities.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import {
  findSimilarOrganizations,
  MAX_ORGANIZATION_NAME_LENGTH,
  parseSearchLimit,
  rankOrganizations,
} from '../services/organizations.js'

export const organizationsRouter = Router()

const withCategories = { categories: { include: { category: true } } } as const

/**
 * Loads the full rows for `ranked`, keeping its order — ranking reads only id and name, so
 * the categories are fetched for the few that made the cut.
 */
const hydrate = async (ranked: { id: string }[]) => {
  if (!ranked.length) return []
  const rows = await prisma.organization.findMany({
    where: { id: { in: ranked.map((organization) => organization.id) } },
    include: withCategories,
  })
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ranked.flatMap((organization) => {
    const row = byId.get(organization.id)
    return row ? [mapBasicOrganization(row)] : []
  })
}

/**
 * Every organization's id and name, for ranking in memory.
 *
 * Fuzzy matching in SQL needs `pg_trgm`, which this deploy does not assume, while the whole
 * table's names are a few kilobytes — the directory page already returns every row. If
 * organizations ever number in the tens of thousands, this is the query to move into the
 * database.
 */
const loadNames = () =>
  prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })

/**
 * `?q=` powers the registration Organization field's suggestions. Without it the response
 * is the full list, so existing callers are unaffected.
 *
 * Case, accents, punctuation and spacing do not matter, a word may carry a typo, and words
 * may come in any order (`lib/search.ts`). Exact and prefix matches rank first. `?limit=`
 * caps the answer (1–20, default 20).
 */
organizationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? collapseWhitespace(req.query.q) : ''

    if (!query) {
      const orgs = await prisma.organization.findMany({ include: withCategories, orderBy: { name: 'asc' } })
      return ok(res, orgs.map((o) => mapBasicOrganization(o)))
    }

    return ok(res, await hydrate(rankOrganizations(await loadNames(), query, parseSearchLimit(req.query.limit))))
  })
)

/**
 * `?name=` → the organizations a new one with that name would probably duplicate: the same
 * name however written, a typo or two away, or one word more. The registration form asks
 * about these before it creates anything. Declared before `/:id`, which would swallow it.
 */
organizationsRouter.get(
  '/similar',
  asyncHandler(async (req, res) => {
    const name =
      typeof req.query.name === 'string' ? collapseWhitespace(req.query.name).slice(0, MAX_ORGANIZATION_NAME_LENGTH) : ''
    if (!name) return ok(res, [])

    return ok(res, await hydrate(findSimilarOrganizations(await loadNames(), name)))
  })
)

organizationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: withCategories,
    })
    if (!org) throw new HttpError(404, 'Organization not found', 404)
    return ok(res, mapOrganization(org))
  })
)
