import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { PLANS } from '@constants/plans'
import { PROVIDER_ROLES } from '@constants/roles'
import { STATE_SLICE_NAMES } from '@constants/store'
import { getSliceActionGroup } from '@helpers/store'
import { ProviderProfileActionPayloads, ProviderProfileSlice } from './types'

const providerProfileActions = getSliceActionGroup(STATE_SLICE_NAMES.profile)

const initialState: ProviderProfileSlice = {
  info: {
    id: '',
    basicInfo: {
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

export const { reducer: profileReducer, actions } = createSlice({
  name: 'profile',
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
      .addMatcher(providerProfileActions.isRejectedAction, (state, action: PayloadAction<Error>) => {
        console.log(action)
        state.isPending = false
        state.error = action.payload ?? new Error('Something went wrong')
      })
      .addMatcher(providerProfileActions.isRejectedAction, (state) => {
        state.isPending = true
      })
      .addMatcher(providerProfileActions.isRejectedAction, (state) => {
        state.isPending = false
      })
  },
})

export const { setProviderProfileData } = actions

export default profileReducer
