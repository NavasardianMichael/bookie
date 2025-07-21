import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getOrganizationAPI } from '@api/organizations/main'
import { appendSelectors } from '@store/appendSelectors'
import { OrganizationActions, OrganizationState } from './types'

const initialState: OrganizationState = {
  id: '',
  basic: {
    name: '',
    description: '',
    categories: [],
  },
  details: {
    address: '',
    phone: '',
    email: '',
    country: '',
    logoUrl: '',
    website: '',
  },
  isPending: false,
  error: null,
}

export const useOrganizationBase = create<OrganizationState & OrganizationActions>()(
  immer(
    combine(
      initialState,
      (set): OrganizationActions => ({
        setOrganizationState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        getOrganization: async (args) => {
          const organization = await getOrganizationAPI(args)
          set((state) => {
            return {
              ...state,
              ...organization,
            }
          })
        },
      })
    )
  )
)

export const useOrganizationStore = appendSelectors(useOrganizationBase)
