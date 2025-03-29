import { configureStore } from '@reduxjs/toolkit'
import { STATE_SLICE_NAMES } from 'helpers/constants/store'
import miniEntitiesReducer from './miniEntities/slice'
import postsReducer from './posts/slice'
import profileReducer from './profile/slice'

export const store = configureStore({
  reducer: {
    [STATE_SLICE_NAMES.posts]: postsReducer,
    [STATE_SLICE_NAMES.profile]: profileReducer,
    [STATE_SLICE_NAMES.miniEntities]: miniEntitiesReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
