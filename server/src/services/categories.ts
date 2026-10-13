import { categoryLabels, SEEDED_CATEGORY_NAMES } from '../lib/category-names.js'
import { asTrimmedString } from '../lib/request.js'
import { collapseWhitespace, isSameName, isSimilarName, matchScore } from '../lib/search.js'

/**
 * Validation, search and duplicate detection for categories — plain functions, like
 * `organizations.ts`, so they are testable without a database.
 *
 * Categories belong to **providers only** (`ProviderCategory`, at most
 * `MAX_PROVIDER_CATEGORIES` each). An organization's categories are its providers', derived
 * on read; a service has none. Two kinds of row share the table: the predefined ones
 * (`SEEDED_CATEGORY_NAMES`, translated into every locale) and the ones providers add,
 * which keep the name they were typed with and are deleted once no provider uses them.
 */
export const MAX_PROVIDER_CATEGORIES = 3

/** Mirrors `MAX_CHARS_FOR_CATEGORY_NAME` in `src/constants/form.ts`. */
export const MAX_CATEGORY_NAME_LENGTH = 40

/** `GET /categories?q=` answers at most this many, and never more than a caller's `limit`. */
export const MAX_CATEGORY_SEARCH_RESULTS = 20

/** `GET /categories/similar` — enough to recognise the one meant, few enough for a dialog. */
export const MAX_SIMILAR_CATEGORIES = 3

type NamedCategory = { id: string; name: string }

/**
 * One category a request names: an existing one by `id`, or a `name` to link or create.
 * The id wins when both are sent, as with organizations.
 */
export type CategoryChoice = { id: string } | { name: string }

/** The predefined categories are permanent: never pruned, whoever stops using them. */
export const isPredefinedCategory = (name: string): boolean => (SEEDED_CATEGORY_NAMES as readonly string[]).includes(name)

/** As stored: trimmed, inner whitespace collapsed, capped, and trimmed again after the cut. */
export const cleanCategoryName = (value: unknown): string =>
  typeof value === 'string' ? collapseWhitespace(value).slice(0, MAX_CATEGORY_NAME_LENGTH).trimEnd() : ''

/**
 * A request's `categories` array, as choices: unknown entries dropped, duplicates (the same
 * id, or the same name however written) collapsed. **Not capped** — the route refuses more
 * than `MAX_PROVIDER_CATEGORIES` rather than silently keeping the first few. Anything that
 * is not an array reads as none.
 */
export const parseCategoryChoices = (value: unknown): CategoryChoice[] => {
  if (!Array.isArray(value)) return []
  const choices: CategoryChoice[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const raw = entry as Record<string, unknown>
    const id = asTrimmedString(raw.id)
    if (id) {
      if (!choices.some((choice) => 'id' in choice && choice.id === id)) choices.push({ id })
      continue
    }
    const name = cleanCategoryName(raw.name)
    if (name && !choices.some((choice) => 'name' in choice && isSameName(choice.name, name))) choices.push({ name })
  }
  return choices
}

/** `?limit=` for the category search: an integer from 1 to the cap, else the cap. */
export const parseCategorySearchLimit = (value: unknown): number => {
  const limit = typeof value === 'string' ? Number(value) : NaN
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_CATEGORY_SEARCH_RESULTS
    ? limit
    : MAX_CATEGORY_SEARCH_RESULTS
}

/** The best a category scores for `query` over every name it goes by, in any language. */
const bestScore = (category: NamedCategory, query: string): number =>
  Math.max(0, ...categoryLabels(category.name).map((label) => matchScore(label, query)))

/**
 * The search's order, as for organizations — exact, prefix, word start, substring, then
 * words matched by prefix or a typo — judged against every label, so "стомат" finds
 * Dentistry. Equal scores keep the input's order.
 */
export const rankCategories = <T extends NamedCategory>(categories: readonly T[], query: string, limit: number): T[] =>
  categories
    .map((category, index) => ({ category, index, score: bestScore(category, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((entry) => entry.category)

const sameNamed = (category: NamedCategory, name: string): boolean =>
  categoryLabels(category.name).some((label) => isSameName(label, name))

/**
 * The categories a new one called `name` would probably duplicate — the same name in any
 * label first, then near misses. What the forms ask about before they add one.
 */
export const findSimilarCategories = <T extends NamedCategory>(categories: readonly T[], name: string): T[] =>
  categories
    .filter((category) => categoryLabels(category.name).some((label) => isSimilarName(label, name)))
    .sort((left, right) => Number(sameNamed(right, name)) - Number(sameNamed(left, name)))
    .slice(0, MAX_SIMILAR_CATEGORIES)

/**
 * The category a new one called `name` **is** — the same name however cased, spaced or
 * punctuated, or any translated label of a predefined one. Linked silently instead of
 * creating a copy: "dentistry" and "Стоматология" are both the Dentistry row.
 */
export const findSameNamedCategory = <T extends NamedCategory>(categories: readonly T[], name: string): T | undefined =>
  categories.find((category) => sameNamed(category, name))

/**
 * Unique by id, in first-seen order — an organization's categories, gathered from its
 * providers', where two providers sharing one must not list it twice.
 */
export const uniqueCategories = <T extends { id: string }>(categories: readonly T[]): T[] => {
  const seen = new Set<string>()
  return categories.filter((category) => !seen.has(category.id) && Boolean(seen.add(category.id)))
}
