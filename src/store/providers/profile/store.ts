import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { putProviderProviderProfileAPI } from '@api/providers/main'
import { appendSelectors } from '@store/appendSelectors'
import { PLANS } from '@constants/plans'
import { PROVIDER_ROLES } from '@constants/roles'
import { ProviderProfileActions, ProviderProfileState } from './types'

const initialState: ProviderProfileState = {
  id: '',
  basic: {
    firstName: '',
    lastName: '',
    image: '',
    categories: [],
  },
  details: {
    location: {
      address: '',
    },
    country: '',
    email: '',
    phone: '',
  },
  role: PROVIDER_ROLES.provider,
  plan: PLANS.free,
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
        putProviderProfileData: async (args) => {
          await putProviderProviderProfileAPI(args)
        },
      })
    )
  )
)

export const useProviderProfileStore = appendSelectors(useProviderProfileStoreBase)
