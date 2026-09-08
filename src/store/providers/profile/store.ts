import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  deleteProviderServiceAPI,
  getProviderProfileAPI,
  postProviderServiceAPI,
  putProviderProfileAPI,
  putProviderServiceAPI,
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
        // Both writes store the API's own answer rather than the payload that was sent.
        // The response is the only thing that carries the generated id and the stored
        // `/uploads/...` path — merging the request instead left a fresh service under a
        // `File` object for its image and a create without its server-side id.
        postProviderService: async (args) => {
          const service = await postProviderServiceAPI(args)
          set((state) => {
            state.services.byId[service.id] = service
            if (!state.services.allIds.includes(service.id)) state.services.allIds.push(service.id)
          })
        },
        putProviderService: async (args) => {
          const service = await putProviderServiceAPI(args)
          set((state) => {
            state.services.byId[service.id] = service
          })
        },
      })
    )
  )
)

export const useProviderProfileStore = appendSelectors(useProviderProfileStoreBase)
