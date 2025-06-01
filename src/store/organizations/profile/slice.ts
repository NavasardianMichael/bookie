import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from '@constants/store'
import { getSliceActionGroup } from '@helpers/store'
import { OrganizationProfileActionPayloads, OrganizationProfileSlice } from './types'

const sliceSpecificActions = getSliceActionGroup(STATE_SLICE_NAMES.organizationProfile)

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

export const { reducer: organizationProfileReducer, actions } = createSlice({
  name: STATE_SLICE_NAMES.organizationProfile,
  initialState,
  reducers: {
    setOrganizationProfileData: (
      state,
      { payload }: PayloadAction<OrganizationProfileActionPayloads['setOrganizationProfileData']>
    ) => {
      return {
        ...state,
        ...payload,
      }
    },
    setOrganizationInfo: (
      state,
      { payload }: PayloadAction<OrganizationProfileActionPayloads['setOrganizationInfo']>
    ) => {
      state.info = {
        ...state.info,
        ...payload,
      }
    },
    resetErrorMessage: (state) => {
      state.error = null
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

export const { setOrganizationProfileData, setOrganizationInfo, resetErrorMessage } = actions

export default organizationProfileReducer
