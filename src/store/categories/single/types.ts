import { GetCategoryAPI } from '@api/categories/types'
import { BasicOrganization } from '@store/organizations/single/types'
import { BasicProvider } from '@store/providers/list/types'
import { StateCommonProps } from '@interfaces/store'

export type CategoryState = StateCommonProps & Category

export type Category = {
  id: string
  name: string
  organizations: BasicOrganization[]
  providers: BasicProvider[]
}

export type BasicCategory = Pick<Category, 'id' | 'name' | 'organizations' | 'providers'>

/**
 * A category as the provider forms' search and similar-name lookup answer it — what an
 * option and a chip need, and nothing a directory page lists.
 */
export type NamedCategory = Pick<Category, 'id' | 'name'>

export type CategoryActions = {
  setCategoryState: (payload: Partial<CategoryState>) => void
  getCategory: (args: GetCategoryAPI['payload']) => void
}
