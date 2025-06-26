import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { OrganizationProfileActions, OrganizationProfileSlice } from './types'

const initialState: OrganizationProfileSlice = {
  info: {
    id: '',
    name: '',
  },
  providerIds: [],
  services: [],
  isPending: false,
  error: null,
}

export const useConsumerProfileStoreBase = create<OrganizationProfileSlice & OrganizationProfileActions>()(
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
