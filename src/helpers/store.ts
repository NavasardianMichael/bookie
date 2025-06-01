import { Action, createAsyncThunk } from '@reduxjs/toolkit'
import { StateSliceName, ThunkConfig } from '@interfaces/store'

export const createAppAsyncThunk = createAsyncThunk.withTypes<ThunkConfig>()

export const isFulfilledAction = (action: Action) => action.type.endsWith('/fulfilled')

export const isPendingAction = (action: Action) => action.type.endsWith('/pending')

export const isRejectedAction = (action: Action) => action.type.endsWith('/rejected')

export const getSliceActionGroup = (name: StateSliceName) => ({
  isFulfilledAction: (action: Action) => action.type.startsWith(name) && action.type.endsWith('/fulfilled'),
  isPendingAction: (action: Action) => action.type.startsWith(name) && action.type.endsWith('/pending'),
  isRejectedAction: (action: Action) => action.type.startsWith(name) && action.type.endsWith('/rejected'),
})
