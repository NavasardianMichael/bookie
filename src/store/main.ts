import { configureStore } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from '@constants/store'
import consumerProfileReducer from './consumers/profile/slice'
import organizationsListReducer from './organizations/list/slice'
import organizationProfileReducer from './organizations/profile/slice'
import providersListReducer from './providers/list/slice'
import providerProfileReducer from './providers/profile/slice'

export const store = configureStore({
  reducer: {
    [STATE_SLICE_NAMES.organizationsList]: organizationsListReducer,
    [STATE_SLICE_NAMES.organizationProfile]: organizationProfileReducer,
    [STATE_SLICE_NAMES.providersList]: providersListReducer,
    [STATE_SLICE_NAMES.providerProfile]: providerProfileReducer,
    [STATE_SLICE_NAMES.consumersList]: providersListReducer,
    [STATE_SLICE_NAMES.consumerProfile]: consumerProfileReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
