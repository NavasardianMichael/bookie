import { CategoriesListState } from '@store/categories/list/types'
import { BasicCategory, Category, NamedCategory } from '@store/categories/single/types'
import { Endpoint } from '@interfaces/api'

export type BasicCategoryResponse = BasicCategory
export type CategoryResponse = Category

export type GetCategoriesListAPI = Endpoint<{
  payload: void
  response: BasicCategoryResponse[]
  processed: CategoriesListState['list']
}>

export type GetCategoryAPI = Endpoint<{
  payload: Pick<Category, 'id'>
  response: CategoryResponse
  processed: Category
}>

/**
 * The provider Categories field's suggestions (`GET /categories?q=`): ranked, typo-tolerant,
 * and a predefined category found by any of its translated labels.
 */
export type SearchCategoriesAPI = Endpoint<{
  payload: { query: string; limit?: number }
  response: NamedCategory[]
  processed: NamedCategory[]
}>

/** The categories a new one with this name would probably duplicate — asked about on submit. */
export type FindSimilarCategoriesAPI = Endpoint<{
  payload: { name: string }
  response: NamedCategory[]
  processed: NamedCategory[]
}>
