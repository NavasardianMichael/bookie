import { RootState } from '@store/main'

export const selectConsumerProfileSlice = (state: RootState) => state.consumerProfile

export const selectConsumerProfile = (state: RootState) => state.consumerProfile.info
