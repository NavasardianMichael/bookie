import { categories } from '@app/api/_shared/db/categories'
import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getCategoriesListAPI } from '@api/categories/main'
import { appendSelectors } from '@store/appendSelectors'
import { flatToNormalized } from '@helpers/commons'
import { CategoriesListActions, CategoriesListState } from './types'

const initialState: CategoriesListState = {
  list: flatToNormalized(categories),
  isPending: false,
  error: null,
}

const useCategoriesListStoreBase = create<CategoriesListState & CategoriesListActions>()(
  immer(
    combine(
      initialState,
      (set): CategoriesListActions => ({
        setCategoriesListState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        setCategoriesList: (payload) => {
          set((state) => {
            state.list = {
              ...state.list,
              ...payload,
            }
          })
        },
        getCategoriesList: async () => {
          const normalizedCategories = await getCategoriesListAPI()

          set((state) => {
            state.list = normalizedCategories
          })
        },
      })
    )
  )
)

export const useCategoriesListStore = appendSelectors(useCategoriesListStoreBase)
