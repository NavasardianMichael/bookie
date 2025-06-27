import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { OrganizationProfileActions, OrganizationProfileState } from './types'

const initialState: OrganizationProfileState = {
  info: {
    id: '',
    name: '',
    address: '',
  },
  providerIds: [],
  services: [],
  isPending: false,
  error: null,
}

export const useConsumerProfileStoreBase = create<OrganizationProfileState & OrganizationProfileActions>()(
  immer(
    combine(
      initialState,
      (set): OrganizationProfileActions => ({
        setOrganizationProfileData: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        setOrganizationInfo: (payload) => {
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
