import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getCategoryAPI } from '@api/categories/main'
import { appendSelectors } from '@store/appendSelectors'
import { CategoryActions, CategoryState } from './types'

const initialState: CategoryState = {
  id: '',
  name: '',
  organizations: [],
  providers: [],
  isPending: false,
  error: null,
}

export const useCategoryBase = create<CategoryState & CategoryActions>()(
  immer(
    combine(
      initialState,
      (set): CategoryActions => ({
        setCategoryState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        getCategory: async (args) => {
          const category = await getCategoryAPI(args)
          set((state) => {
            return {
              ...state,
              ...category,
            }
          })
        },
      })
    )
  )
)

export const useCategoryStore = appendSelectors(useCategoryBase)
