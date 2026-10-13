'use client'

import { searchCategoriesAPI } from '@api/categories/main'
import { NamedCategory } from '@store/categories/single/types'
import { useDebouncedLookup } from '@hooks/useDebouncedLookup'
import { collapseWhitespace } from '@helpers/search'

/** Enough to recognise the one meant, short enough that the add-new row stays in view. */
export const CATEGORY_SUGGESTIONS_LIMIT = 5

/** From the first character, as for organizations: the dropdown also carries "add as new". */
const MIN_QUERY_LENGTH = 1

const SUGGESTIONS_DEBOUNCE_MS = 300

export type CategorySuggestions = {
  categories: NamedCategory[]
  /** Nothing typed yet, so the dropdown stays shut. */
  isIdle: boolean
  isLoading: boolean
  /** The latest request failed. Adding a new category still works. */
  failed: boolean
}

const fetchCategories = (query: string): Promise<NamedCategory[]> =>
  searchCategoriesAPI({ query, limit: CATEGORY_SUGGESTIONS_LIMIT })

/**
 * The provider Categories field's dropdown: the categories the API ranks best for the typed
 * text — case, accents, spacing, a typo and word order ignored, and a predefined category
 * found by any of its translated labels, so "стомат" offers Dentistry. The same lookup the
 * Organization field makes (`useOrganizationSuggestions`).
 */
export const useCategorySuggestions = (text: string): CategorySuggestions => {
  const query = collapseWhitespace(text)

  const { result, ...status } = useDebouncedLookup(
    query.length >= MIN_QUERY_LENGTH ? query : null,
    fetchCategories,
    { delayMs: SUGGESTIONS_DEBOUNCE_MS, errorContext: 'CategoriesField:suggestions' }
  )

  return { categories: result ?? [], ...status }
}
