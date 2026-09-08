import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getCategoriesListAPI } from '@api/categories/main'
import { appendSelectors } from '@store/appendSelectors'
import { CategoriesListActions, CategoriesListState } from './types'

// Empty until `getCategoriesList` runs. This used to ship one fake row whose `allIds`
// entry ('c-1') did not even match its own `byId` key ('smth'), so every category picker
// offered a category id the API had never heard of — and `Service.categoryId` is a
// required foreign key, so choosing it failed the save.
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
