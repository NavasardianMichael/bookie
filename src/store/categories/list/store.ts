import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getCategoriesListAPI } from '@api/categories/main'
import { appendSelectors } from '@store/appendSelectors'
import { CategoriesListActions, CategoriesListState } from './types'

const initialState: CategoriesListState = {
  list: {
    allIds: [],
    byId: {},
  },
  isPending: false,
  error: null,
}

export const useCategoriesListStoreBase = create<CategoriesListState & CategoriesListActions>()(
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
