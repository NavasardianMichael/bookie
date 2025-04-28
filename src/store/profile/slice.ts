import { PROFILE_INITIAL_DATA } from '@constants/profile'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { ProviderProfileActionPayloads, ProviderProfileSlice } from '@store/providers/profile/types'

const initialState: ProviderProfileSlice = {
  isLoggedIn: false,
  info: {
    ...PROFILE_INITIAL_DATA,
  },
  members: [],
  services: []
}

export const { reducer: profileReducer, actions } = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfileData: (state, { payload }: PayloadAction<ProviderProfileActionPayloads['setProfileData']>) => {
      return {
        ...state,
        ...payload,
      }
    },
    setIsLoggedIn: (state, { payload }: PayloadAction<ProviderProfileActionPayloads['setIsLoggedIn']>) => {
      state.isLoggedIn = payload
    },
  },
  extraReducers: (builder) => {
    builder
    // .addMatcher(isRejectedAction, (state, action: PayloadAction<SerializedError>) => {
    //   console.log(action)
    //   state.isPending = false
    //   state.errorMessage = action.payload.message ?? 'Rejected Action.'
    // })
    // .addMatcher(isPendingAction, (state) => {
    //   state.isPending = true
    // })
    // .addMatcher(isFulfilledAction, (state) => {
    //   state.isPending = false
    // })
  },
})

export const { setProfileData, setIsLoggedIn } = actions

export default profileReducer
