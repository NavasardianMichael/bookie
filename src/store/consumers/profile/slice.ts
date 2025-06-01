import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from '@constants/store'
import { getSliceActionGroup } from '@helpers/store'
import { ConsumerProfileActionPayloads, ConsumerProfileSlice } from './types'

const sliceSpecificActions = getSliceActionGroup(STATE_SLICE_NAMES.consumerProfile)

const initialState: ConsumerProfileSlice = {
  info: {
    id: '',
    name: '',
    favouriteProviders: [],
  },
  isPending: false,
  error: null,
}

export const { reducer: consumerProfileReducer, actions } = createSlice({
  name: STATE_SLICE_NAMES.consumerProfile,
  initialState,
  reducers: {
    setConsumerProfileSlice: (
      state,
      { payload }: PayloadAction<ConsumerProfileActionPayloads['setConsumerProfileSlice']>
    ) => {
      return {
        ...state,
        ...payload,
      }
    },
    setConsumerProfileInfo: (
      state,
      { payload }: PayloadAction<ConsumerProfileActionPayloads['setConsumerProfileInfo']>
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

export const { setConsumerProfileSlice, setConsumerProfileInfo, resetErrorMessage } = actions

export default consumerProfileReducer
