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
        getProvidersList: async () => {
          const normalizedProviders = await getProvidersListAPI()

          set((state) => {
            state.list = normalizedProviders
          })
        },
      })
    )
  )
)

export const useProvidersListStore = appendSelectors(useProvidersListStoreBase)
