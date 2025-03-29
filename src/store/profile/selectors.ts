import { RootState } from 'store/main'

export const selectProfileData = (state: RootState) => state.profile.data

export const selectIsLoggedIn = (state: RootState) => state.profile.isLoggedIn

export const selectIsProfileSlicePending = (state: RootState) => state.profile.isPending

export const selectErrorMessage = (state: RootState) => state.profile.errorMessage
