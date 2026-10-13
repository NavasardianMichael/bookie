import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { SEEDED_CATEGORY_NAMES } from '../lib/category-names.js'
import { prisma } from '../lib/prisma.js'
import { collapseWhitespace } from '../lib/search.js'
import {
  mapBasicCategory,
  mapBasicOrganization,
  mapBasicProvider,
  mapCategoryDetail,
  organizationInclude,
  providerInclude,
} from '../mappers/entities.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import {
  findSimilarCategories,
  MAX_CATEGORY_NAME_LENGTH,
  parseCategorySearchLimit,
  rankCategories,
} from '../services/categories.js'
import { PUBLIC_PROVIDER_WHERE } from '../services/providerSearch.js'

export const categoriesRouter = Router()

/** A listed provider in this category — the only kind a public page names. */
const publicProviderInCategory = (categoryId: string) => ({
  ...PUBLIC_PROVIDER_WHERE,
  categories: { some: { categoryId } },
})

/**
 * Everything one category page shows: its listed providers, and the organizations at least
 * one of them works for — an organization's categories are its providers' (see `Category`).
 */
const loadCategoryDetail = async (category: { id: string; name: string }) => {
  const [providers, organizations] = await Promise.all([
    prisma.provider.findMany({ where: publicProviderInCategory(category.id), include: providerInclude }),
    prisma.organization.findMany({
      where: { providers: { some: publicProviderInCategory(category.id) } },
      include: organizationInclude,
      orderBy: { name: 'asc' },
    }),
  ])
  return mapCategoryDetail(category, organizations.map(mapBasicOrganization), providers.map(mapBasicProvider))
}

/**
 * Every category's id and name, for ranking in memory — the table is a few dozen rows, and
 * matching a predefined category's sixteen translated labels is not something SQL does well.
 */
const loadNames = () => prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })

/**
 * Without `?q=`: the directory — every predefined category, and each added one that a listed
 * provider uses (an added category whose only providers are unlisted would be an empty page).
 *
 * With `?q=`: the provider forms' category suggestions, `{ id, name }` only — case, accents,
 * spacing, a typo and word order ignored, and a predefined category found by any of its
 * translated labels. `?limit=` caps it (1–20, default 20).
 */
categoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? collapseWhitespace(req.query.q) : ''
    if (query) {
      const ranked = rankCategories(await loadNames(), query, parseCategorySearchLimit(req.query.limit))
      return ok(res, ranked.map(mapBasicCategory))
    }

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ name: { in: [...SEEDED_CATEGORY_NAMES] } }, { providers: { some: { provider: PUBLIC_PROVIDER_WHERE } } }],
      },
      orderBy: { name: 'asc' },
    })
    return ok(res, await Promise.all(categories.map(loadCategoryDetail)))
  })
)

/**
 * `?name=` → the categories a new one with that name would probably duplicate: the same name
 * in any spelling or language, a typo away, or one word more. The provider forms ask about
 * these before they add a category. Declared before `/:id`, which would swallow it.
 */
categoriesRouter.get(
  '/similar',
  asyncHandler(async (req, res) => {
    const name =
      typeof req.query.name === 'string' ? collapseWhitespace(req.query.name).slice(0, MAX_CATEGORY_NAME_LENGTH) : ''
    if (!name) return ok(res, [])
    return ok(res, findSimilarCategories(await loadNames(), name).map(mapBasicCategory))
  })
)

categoriesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!category) throw new HttpError(404, 'Category not found', 404)
    return ok(res, await loadCategoryDetail(category))
  })
)
