import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getSingleProviderAPI } from '@api/providers/main'
import { appendSelectors } from '@store/appendSelectors'
import { SingleProviderActions, SingleProviderState } from './types'
import { PROVIDER_PROFILE_INITIAL_STATE } from '../profile/store'

const base = structuredClone(PROVIDER_PROFILE_INITIAL_STATE)

const initialState: SingleProviderState = {
  id: base.id,
  basic: base.basic,
  details: base.details,
  services: base.services,
  isPending: false,
  error: null,
}

export const useSingleProviderBase = create<SingleProviderState & SingleProviderActions>()(
  immer(
    combine(
      initialState,
      (set): SingleProviderActions => ({
        setSingleProviderState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        getSingleProvider: async (args) => {
          const provider = await getSingleProviderAPI(args)
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

export const useSingleProviderStore = appendSelectors(useSingleProviderBase)
