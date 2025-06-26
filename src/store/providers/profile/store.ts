import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { PLANS } from '@constants/plans'
import { PROVIDER_ROLES } from '@constants/roles'
import { ProviderProfileActions, ProviderProfileState } from './types'

const initialState: ProviderProfileState = {
  info: {
    id: '',
    basic: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      image: '',
    },
    details: {
      role: PROVIDER_ROLES.provider,
      plan: PLANS.free,
    },
  },
  organizationId: '',
  services: [],
  isPending: false,
  error: null,
}

export const useProviderProfileStoreBase = create<ProviderProfileState & ProviderProfileActions>()(
  immer(
    combine(
      initialState,
      (set): ProviderProfileActions => ({
        setProviderProfileData: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        setProviderInfo: (payload) => {
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

export const useProviderProfileStore = appendSelectors(useProviderProfileStoreBase)
