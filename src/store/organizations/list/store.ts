import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getOrganizationsListAPI } from '@api/organizations/main'
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
        setOrganizationsListState: (payload) => {
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
        getOrganizationsList: async () => {
          const normalizedOrganizations = await getOrganizationsListAPI()
          console.log({ normalizedOrganizations })

          set((state) => {
            state.list = normalizedOrganizations
          })
        },
      })
    )
  )
)

export const useOrganizationsListStore = appendSelectors(useOrganizationsListStoreBase)
