import { STATE_SLICE_NAMES } from '@constants/store'
import { SerializedError } from '@reduxjs/toolkit'
import { AppDispatch, RootState } from "@store/main"

export type ThunkConfig = {
  state: RootState
  dispatch: AppDispatch
  rejectValue: SerializedError
}

export type StateSliceName = (typeof STATE_SLICE_NAMES)[keyof typeof STATE_SLICE_NAMES]
