import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getProvidersListAPI } from '@api/providers/main'
import { appendSelectors } from '@store/appendSelectors'
import { ProvidersListActions, ProvidersListState } from './types'

const initialState: ProvidersListState = {
  list: {
    allIds: [],
    byId: {},
  },
  pagination: {
    total: 0,
    page: 1,
    perPage: 0,
    pageCount: 1,
  },
  isPending: false,
  error: null,
}

export const useProvidersListStoreBase = create<ProvidersListState & ProvidersListActions>()(
  immer(
    combine(
      initialState,
      (set): ProvidersListActions => ({
        setProvidersListState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        setProvidersList: (payload) => {
          set((state) => {
            state.list = {
              ...state.list,
              ...payload,
            }
          })
        },
        getProvidersList: async (args) => {
          const { list, pagination } = await getProvidersListAPI(args)

          set((state) => {
            state.list = list
            state.pagination = pagination
          })
        },
      })
    )
  )
)

export const useProvidersListStore = appendSelectors(useProvidersListStoreBase)
