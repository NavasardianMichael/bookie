import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  deleteProviderServiceAPI,
  editProviderServiceAPI,
  getProviderProfileAPI,
  putProviderProfileAPI,
} from '@api/providers/main'
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
      monday: { availability: { start: '', end: '' }, breaks: [] },
      tuesday: { availability: { start: '', end: '' }, breaks: [] },
      wednesday: { availability: { start: '', end: '' }, breaks: [] },
      thursday: { availability: { start: '', end: '' }, breaks: [] },
      friday: { availability: { start: '', end: '' }, breaks: [] },
      saturday: { availability: { start: '', end: '' }, breaks: [] },
      sunday: { availability: { start: '', end: '' }, breaks: [] },
    },
  },
  services: {
    allIds: [],
    byId: {},
  },
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
        getProviderProfileData: async () => {
          const profile = await getProviderProfileAPI()
          set((state) => {
            return {
              ...state,
              ...profile,
            }
          })
        },
        putProviderProfileData: async (args) => {
          await putProviderProfileAPI(args)
        },
        deleteProviderService: async (args) => {
          await deleteProviderServiceAPI(args)
          set((state) => {
            if (state.services.byId[args.serviceId]) {
              delete state.services.byId[args.serviceId]
              state.services.allIds = state.services.allIds.filter((id) => id !== args.serviceId)
            }
          })
        },
        editProviderService: async (args) => {
          await editProviderServiceAPI(args)
          set((state) => {
            const currentServiceState = state.services.byId[args.service.Id]
            if (currentServiceState) {
              state.services.byId[args.service.Id] = { ...currentServiceState, ...args.service }
            }
          })
        },
      })
    )
  )
)

export const useProviderProfileStore = appendSelectors(useProviderProfileStoreBase)
