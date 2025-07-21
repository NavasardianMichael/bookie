import { BasicCategory } from '@store/categories/single/types'
import { BasicCategoryResponse, GetCategoriesListAPI, GetCategoryAPI } from './types'

export const processCategoriesListResponse: GetCategoriesListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, category) => {
      const processedCategory = processBasicCategoryResponse(category)
      acc.byId[category.id] = processedCategory
      acc.allIds.push(category.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetCategoriesListAPI['processed']
  )
}

export const processBasicCategoryResponse = (category: BasicCategoryResponse): BasicCategory => {
  return category
}

export const processCategoryResponse: GetCategoryAPI['processor'] = (category) => {
  return category.value
}
