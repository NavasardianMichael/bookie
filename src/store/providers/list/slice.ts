import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from '@constants/store'
import { getSliceActionGroup } from '@helpers/store'
import { ProviderProfileActionPayloads, ProvidersListSlice } from './types'

const sliceSpecificActions = getSliceActionGroup(STATE_SLICE_NAMES.providersList)

const initialState: ProvidersListSlice = {
  list: {
    allIds: [],
    byId: {},
  },
  isPending: false,
  error: null,
}

export const { reducer: providersListReducer, actions } = createSlice({
  name: STATE_SLICE_NAMES.providersList,
  initialState,
  reducers: {
    setProvidersList: (state, { payload }: PayloadAction<ProviderProfileActionPayloads['setProvidersList']>) => {
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

export const { setProvidersList, resetErrorMessage } = actions

export default providersListReducer
