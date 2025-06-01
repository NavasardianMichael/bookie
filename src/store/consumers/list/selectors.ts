import { RootState } from '@store/main'

export const selectConsumersListSlice = (state: RootState) => state.consumersList

export const selectConsumersList = (state: RootState) => state.consumersList.list
