import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { OrganizationsListActions, OrganizationsListState } from './types'

const initialState: OrganizationsListState = {
  list: {
    allIds: [],
    byId: {},
  },
  isPending: false,
  error: null,
}

export const useOrganizationsListStoreBase = create<OrganizationsListState & OrganizationsListActions>()(
  immer(
    combine(
      initialState,
      (set): OrganizationsListActions => ({
        setOrganizationsListSlice: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        setOrganizationList: (payload) => {
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

export const useOrganizationsListStore = appendSelectors(useOrganizationsListStoreBase)
