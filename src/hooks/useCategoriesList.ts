import { useCategoriesListStore } from '@store/categories/list/store'
import { normalizedToFlat } from '@helpers/commons'

export const useCategoriesList = () => {
  const normalized = useCategoriesListStore.use.list()
  return normalizedToFlat(normalized)
}
