import { PayloadAction, SerializedError, createSlice } from '@reduxjs/toolkit'
import { PROFILE_INITIAL_DATA } from '@constants/profile'
import { isFulfilledAction, isPendingAction, isRejectedAction } from '@helpers/store'
import { ProfileActionPayloads, ProfileSlice } from './types'

const initialState: ProfileSlice = {
  data: PROFILE_INITIAL_DATA,
  isLoggedIn: false,
  isPending: false,
  errorMessage: '',
}

export const { reducer: profileReducer, actions } = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfileData: (state, { payload }: PayloadAction<ProfileActionPayloads['setProfileData']>) => {
      state.data = {
        ...state.data,
        ...payload,
      }
    },
    setIsLoggedIn: (state, { payload }: PayloadAction<ProfileActionPayloads['setIsLoggedIn']>) => {
      state.isLoggedIn = payload
    },
    resetErrorMessage: (state) => {
      state.errorMessage = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(isRejectedAction, (state, action: PayloadAction<SerializedError>) => {
        console.log(action)
        state.isPending = false
        state.errorMessage = action.payload.message ?? 'Rejected Action.'
      })
      .addMatcher(isPendingAction, (state) => {
        state.isPending = true
      })
      .addMatcher(isFulfilledAction, (state) => {
        state.isPending = false
      })
  },
})

export const { setProfileData, setIsLoggedIn, resetErrorMessage } = actions

export default profileReducer
