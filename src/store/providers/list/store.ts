import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getProvidersListAPI } from '@api/providers/main'
import { appendSelectors } from '@store/appendSelectors'
import { ProviderProfileActions, ProvidersListState } from './types'

const initialState: ProvidersListState = {
  list: {
    allIds: [],
    byId: {},
  },
  isPending: false,
  error: null,
}

export const useProvidersListStoreBase = create<ProvidersListState & ProviderProfileActions>()(
  immer(
    combine(
      initialState,
      (set): ProviderProfileActions => ({
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
        fetchProvidersList: async () => {
          const normalizedProviders = await getProvidersListAPI()
          console.log({ normalizedProviders })

          set((state) => {
            state.list = normalizedProviders
          })
        },
      })
    )
  )
)

export const useProvidersListStore = appendSelectors(useProvidersListStoreBase)
