import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { AssistantPanelActions, AssistantPanelState } from './types'

const initialState: AssistantPanelState = {
  open: false,
  revision: 0,
}

export const useAssistantPanelStoreBase = create<AssistantPanelState & AssistantPanelActions>()(
  immer(
    combine(
      initialState,
      (set): AssistantPanelActions => ({
        setAssistantPanelState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        markApplied: () => {
          set((state) => {
            state.revision += 1
          })
        },
      })
    )
  )
)

export const useAssistantPanelStore = appendSelectors(useAssistantPanelStoreBase)
