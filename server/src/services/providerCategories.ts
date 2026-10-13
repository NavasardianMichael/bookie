import type { Prisma } from '@prisma/client'
import { type CategoryChoice, findSameNamedCategory, MAX_PROVIDER_CATEGORIES } from './categories.js'
import { SEEDED_CATEGORY_NAMES } from '../lib/category-names.js'

type Db = Prisma.TransactionClient

/**
 * The category ids `choices` stand for, in order, at most `MAX_PROVIDER_CATEGORIES`.
 *
 * An id must exist and is dropped otherwise, as an organization id is. A name links the
 * category it already **is** (`findSameNamedCategory` — any spelling, any predefined label,
 * so "Стоматология" is Dentistry) and only otherwise creates a row. That backstop is what
 * keeps the table free of copies: the web form asks about *similar* names first, but a race,
 * a failed lookup or a hand-made request must still not mint "dentistry" beside "Dentistry".
 *
 * Takes the transaction client, so a category is created only if the provider write around
 * it commits.
 */
export const resolveCategoryIds = async (db: Db, choices: readonly CategoryChoice[]): Promise<string[]> => {
  if (!choices.length) return []
  const known = await db.category.findMany({ select: { id: true, name: true } })
  const ids: string[] = []

  for (const choice of choices) {
    let id: string | undefined
    if ('id' in choice) {
      id = known.find((category) => category.id === choice.id)?.id
    } else {
      id = findSameNamedCategory(known, choice.name)?.id
      if (!id) {
        const created = await db.category.create({ data: { name: choice.name }, select: { id: true, name: true } })
        known.push(created)
        id = created.id
      }
    }
    if (id && !ids.includes(id)) ids.push(id)
  }

  return ids.slice(0, MAX_PROVIDER_CATEGORIES)
}

/**
 * Deletes, among `categoryIds`, the categories a provider added that no provider uses any
 * more. The predefined ones are never deleted. Call it after removing links — an edit,
 * deleting the provider page, deleting the account — with the ids that were linked.
 */
export const pruneUnusedCategories = async (db: Db, categoryIds: readonly string[]): Promise<void> => {
  if (!categoryIds.length) return
  await db.category.deleteMany({
    where: { id: { in: [...categoryIds] }, name: { notIn: [...SEEDED_CATEGORY_NAMES] }, providers: { none: {} } },
  })
}

/** The ids a provider holds now — read before deleting it, so they can be pruned after. */
export const providerCategoryIds = async (db: Db, providerId: string): Promise<string[]> =>
  (await db.providerCategory.findMany({ where: { providerId }, select: { categoryId: true } })).map(
    (link) => link.categoryId
  )

/** Replaces a provider's categories with `choices`, then prunes the ones it dropped. */
export const setProviderCategories = async (db: Db, providerId: string, choices: readonly CategoryChoice[]): Promise<void> => {
  const ids = await resolveCategoryIds(db, choices)
  const before = await providerCategoryIds(db, providerId)

  await db.providerCategory.deleteMany({ where: { providerId } })
  if (ids.length) {
    await db.providerCategory.createMany({ data: ids.map((categoryId) => ({ providerId, categoryId })) })
  }
  await pruneUnusedCategories(
    db,
    before.filter((id) => !ids.includes(id))
  )
}
