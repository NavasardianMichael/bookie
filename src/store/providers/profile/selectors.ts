import { RootState } from '@store/main'

export const selectProviderProfileSlice = (state: RootState) => state.providerProfile

export const selectProviderProfile = (state: RootState) => state.providerProfile.info

export const selectProviderServices = (state: RootState) => state.providerProfile.services
