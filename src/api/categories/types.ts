import { CategoriesListState } from '@store/categories/list/types'
import { BasicCategory, Category } from '@store/categories/single/types'
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
