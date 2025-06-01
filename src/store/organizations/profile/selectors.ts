import { RootState } from '@store/main'

export const selectOrganizationProfileSlice = (state: RootState) => state.organizationProfile

export const selectOrganizationProfile = (state: RootState) => state.organizationProfile.info

export const selectOrganizationServices = (state: RootState) => state.organizationProfile.services
