import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { putProviderProfileAPI } from '@api/providers/main'
import { appendSelectors } from '@store/appendSelectors'
import { PLANS } from '@constants/plans'
import { ProviderProfileActions, ProviderProfileState } from './types'

export const PROVIDER_PROFILE_INITIAL_STATE: ProviderProfileState = {
  id: '',
  basic: {
    firstName: '',
    lastName: '',
    image: '',
    categories: [],

    available: true,
  },
  details: {
    location: {
      address: '',
    },
    phone: {
      code: 0,
      number: 0,
    },
    country: '',
    email: '',
    gallery: [],
    weekSchedule: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
  },
  services: [],
  personal: {
    plan: PLANS.free,
  },
  isPending: false,
  error: null,
}

export const useProviderProfileStoreBase = create<ProviderProfileState & ProviderProfileActions>()(
  immer(
    combine(
      PROVIDER_PROFILE_INITIAL_STATE,
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
          await putProviderProfileAPI(args)
        },
      })
    )
  )
)

export const useProviderProfileStore = appendSelectors(useProviderProfileStoreBase)
