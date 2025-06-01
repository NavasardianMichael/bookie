import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { PLANS } from '@constants/plans'
import { PROVIDER_ROLES } from '@constants/roles'
import { STATE_SLICE_NAMES } from '@constants/store'
import { getSliceActionGroup } from '@helpers/store'
import { ProviderProfileActionPayloads, ProviderProfileSlice } from './types'

const sliceSpecificActions = getSliceActionGroup(STATE_SLICE_NAMES.providerProfile)

const initialState: ProviderProfileSlice = {
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

export const { reducer: providerProfileReducer, actions } = createSlice({
  name: STATE_SLICE_NAMES.providerProfile,
  initialState,
  reducers: {
    setProviderProfileData: (
      state,
      { payload }: PayloadAction<ProviderProfileActionPayloads['setProviderProfileData']>
    ) => {
      return {
        ...state,
        ...payload,
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(sliceSpecificActions.isRejectedAction, (state, action: PayloadAction<Error>) => {
        console.log(action)
        state.isPending = false
        state.error = action.payload ?? new Error('Something went wrong')
      })
      .addMatcher(sliceSpecificActions.isRejectedAction, (state) => {
        state.isPending = true
      })
      .addMatcher(sliceSpecificActions.isRejectedAction, (state) => {
        state.isPending = false
      })
  },
})

export const { setProviderProfileData } = actions

export default providerProfileReducer
