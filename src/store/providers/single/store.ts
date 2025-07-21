import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getProviderAPI } from '@api/providers/main'
import { appendSelectors } from '@store/appendSelectors'
import { ProviderActions, ProviderState } from './types'

const initialState: ProviderState = {
  id: '',
  basic: {
    firstName: '',
    lastName: '',
    image: '',
    categories: [],
  },
  details: {
    phone: '',
    country: '',
    address: '',
    email: '',
  },
  services: [],
  isPending: false,
  error: null,
}

export const useProviderBase = create<ProviderState & ProviderActions>()(
  immer(
    combine(
      initialState,
      (set): ProviderActions => ({
        setProviderState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        getProvider: async (args) => {
          const provider = await getProviderAPI(args)
          set((state) => {
            return {
              ...state,
              ...provider,
            }
          })
        },
      })
    )
  )
)

export const useProviderStore = appendSelectors(useProviderBase)
