import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { BasicProvider } from '@store/providers/profile/types'
import { SliceCommonProps } from '@interfaces/store'

export type ConsumerProfileState = SliceCommonProps & {
  info: Consumer
}

export type ConsumerService = {
  id: string
  name: string
  description: string
}

export type Consumer = {
  id: string
  name: string
  favoriteProviders: BasicProvider[]
}

export type ConsumerProfileActions = {
  setConsumerProfileState: (payload: Partial<ConsumerProfileState>) => void
  setConsumerProfileInfo: (payload: Partial<ConsumerProfileState['info']>) => void
}

const initialState: ConsumerProfileState = {
  info: {
    id: '',
    name: '',
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
        setConsumerProfileInfo: (payload) => {
          set((state) => {
            state.info = {
              ...state.info,
              ...payload,
            }
          })
        },
      })
    )
  )
)

export const useConsumerProfileStore = appendSelectors(useConsumerProfileStoreBase)
