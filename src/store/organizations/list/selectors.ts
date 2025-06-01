import { RootState } from '@store/main'

export const selectProfileData = (state: RootState) => state.profile.info

export const selectIsLoggedIn = (state: RootState) => state.profile.isLoggedIn
