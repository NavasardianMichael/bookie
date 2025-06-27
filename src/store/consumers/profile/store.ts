import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { ConsumerProfileActions, ConsumerProfileState } from './types'

const initialState: ConsumerProfileState = {
  id: '',
  basic: {
    name: '',
    phoneNumber: '',
  },
  details: {
    favoriteProviders: [],
  },
  isPending: false,
  error: null,
}

const useConsumerProfileStoreBase = create<ConsumerProfileState & ConsumerProfileActions>()(
  immer(
    combine(
      initialState,
      (set): ConsumerProfileActions => ({
        setConsumerProfileState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
      })
    )
  )
)

export const useConsumerProfileStore = appendSelectors(useConsumerProfileStoreBase)
