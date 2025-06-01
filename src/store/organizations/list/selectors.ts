import { RootState } from '@store/main'

export const selectOrganizationsListSlice = (state: RootState) => state.organizationsList

export const selectOrganizationsList = (state: RootState) => state.organizationsList.list
