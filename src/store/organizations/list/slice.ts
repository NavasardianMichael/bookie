import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from '@constants/store'
import { getSliceActionGroup } from '@helpers/store'
import { OrganizationsListActionPayloads, OrganizationsListSlice } from './types'

const sliceSpecificActions = getSliceActionGroup(STATE_SLICE_NAMES.providersList)

const initialState: OrganizationsListSlice = {
  list: {
    allIds: [],
    byId: {},
  },
  isPending: false,
  error: null,
}

export const { reducer: organizationsListReducer, actions } = createSlice({
  name: STATE_SLICE_NAMES.organizationsList,
  initialState,
  reducers: {
    setOrganizationsListSlice: (
      state,
      { payload }: PayloadAction<OrganizationsListActionPayloads['setOrganizationsListSlice']>
    ) => {
      return {
        ...state,
        ...payload,
      }
    },
    setOrganizationList: (
      state,
      { payload }: PayloadAction<OrganizationsListActionPayloads['setOrganizationList']>
    ) => {
      state.list = {
        ...state.list,
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

export const { setOrganizationsListSlice, setOrganizationList, resetErrorMessage } = actions

export default organizationsListReducer
