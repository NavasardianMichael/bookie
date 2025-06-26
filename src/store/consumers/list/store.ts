import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { ConsumersListActions, ConsumersListState } from './types'

const initialState: ConsumersListState = {
  list: {
    allIds: [],
    byId: {},
  },
  isPending: false,
  error: null,
}

export const useConsumersListStoreBase = create<ConsumersListState & ConsumersListActions>()(
  immer(
    combine(
      initialState,
      (set): ConsumersListActions => ({
        setConsumersListState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        setConsumersList: (payload) => {
          set((state) => {
            state.list = {
              ...state.list,
              ...payload,
            }
          })
        },
      })
    )
  )
)

export const useConsumersListStore = appendSelectors(useConsumersListStoreBase)
