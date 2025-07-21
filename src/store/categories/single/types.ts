import { GetCategoryAPI } from '@api/categories/types'
import { BasicOrganization } from '@store/organizations/single/types'
import { BasicProvider } from '@store/providers/profile/types'
import { StateCommonProps } from '@interfaces/store'

export type CategoryState = StateCommonProps & Category

export type Category = {
  id: string
  name: string
  organizations: BasicOrganization[]
  providers: BasicProvider[]
}

export type BasicCategory = Pick<Category, 'id' | 'name' | 'organizations' | 'providers'>

export type CategoryActions = {
  setCategoryState: (payload: Partial<CategoryState>) => void
  getCategory: (args: GetCategoryAPI['payload']) => void
}
