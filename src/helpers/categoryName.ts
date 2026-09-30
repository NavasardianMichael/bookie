import {
  SEEDED_CATEGORY_MESSAGE_KEYS,
  type SeededCategoryMessageKey,
  type SeededCategoryName,
} from '@constants/categories'

type CategoryNameTranslator = {
  (key: `names.${SeededCategoryMessageKey}`): string
}

/**
 * Localises a category's **stored** English name for display.
 *
 * Seeded specialties are looked up in `Categories.names`; anything else (a free-text
 * category a provider typed) is returned unchanged — those are not in the catalogues.
 */
export const translateCategoryName = (name: string, t: CategoryNameTranslator): string => {
  const key = SEEDED_CATEGORY_MESSAGE_KEYS[name as SeededCategoryName]
  return key ? t(`names.${key}`) : name
}
