import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from '@constants/store'
import { getSliceActionGroup } from '@helpers/store'
import { ConsumersListActionPayloads, ConsumersListSlice } from './types'

const sliceSpecificActions = getSliceActionGroup(STATE_SLICE_NAMES.consumersList)

const initialState: ConsumersListSlice = {
  list: {
    allIds: [],
    byId: {},
  },
  isPending: false,
  error: null,
}

export const { reducer: consumersListReducer, actions } = createSlice({
  name: STATE_SLICE_NAMES.consumersList,
  initialState,
  reducers: {
    setConsumersListSlice: (
      state,
      { payload }: PayloadAction<ConsumersListActionPayloads['setConsumersListSlice']>
    ) => {
      return {
        ...state,
        ...payload,
      }
    },
    setConsumersList: (state, { payload }: PayloadAction<ConsumersListActionPayloads['setConsumersList']>) => {
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

export const { setConsumersListSlice, setConsumersList, resetErrorMessage } = actions

export default consumersListReducer
