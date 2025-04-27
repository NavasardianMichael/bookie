import { configureStore } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from '@constants/store'
import profileReducer from './profile/slice'

export const store = configureStore({
  reducer: {
    [STATE_SLICE_NAMES.profile]: profileReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
