import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'
import { BasicCategory } from '../single/types'

export type CategoriesListState = StateCommonProps & {
  list: Normalized<BasicCategory>
}

export type CategoriesListActions = {
  setCategoriesListState: (payload: Partial<CategoriesListState>) => void
  setCategoriesList: (payload: Partial<CategoriesListState['list']>) => void
  getCategoriesList: () => Promise<void>
}
