import { StateSliceName, ThunkConfig } from '@interfaces/store'
import { Action, AnyAction, createAsyncThunk } from '@reduxjs/toolkit'

export const createAppAsyncThunk = createAsyncThunk.withTypes<ThunkConfig>()

export const isFulfilledAction = (action: Action) => action.type.endsWith('/fulfilled')

export const isPendingAction = (action: Action) => action.type.endsWith('/pending')

export const isRejectedAction = (action: Action) => action.type.endsWith('/rejected')

export const getSliceActionGroup = (name: StateSliceName) => {
  return (groupName: string) => {
    return (action: AnyAction) => action.type.startsWith(name) && action.type.endsWith(groupName)
  }
}
