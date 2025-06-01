import { RootState } from '@store/main'

export const selectProvidersListSlice = (state: RootState) => state.providersList

export const selectProvidersList = (state: RootState) => state.providersList.list
