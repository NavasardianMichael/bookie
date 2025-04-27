import { AxiosError, isAxiosError } from 'axios'
import { googleSignIn } from '@api/auth/google'
import {
  changePasswordAPI,
  getProfileAPI,
  loginAPI,
  logoutAPI,
  registerAPI,
  resetPasswordAPI,
  sendForgotPasswordInstructionsAPI,
} from '@api/auth/main'
import {
  ChangePasswordAPI,
  GetProfileAPI,
  LoginAPI,
  LogoutAPI,
  RegisterAPI,
  ResetPasswordAPI,
  SendForgotPasswordInstructionsAPI,
} from '@api/auth/types'
import { LoginTypes } from '@interfaces/auth'
import { LOGIN_TYPES } from '@constants/auth/login'
import { PROFILE_INITIAL_DATA } from '@constants/profile'
import { STATE_SLICE_NAMES } from '@constants/store'
import { createAppAsyncThunk } from '@helpers/store'
import { setIsLoggedIn, setProfileData } from './slice'
import { Profile } from './types'

export const loginThunk = createAppAsyncThunk<void, { loginType: LoginTypes; values: LoginAPI['payload'] }>(
  `${STATE_SLICE_NAMES.profile}/login`,
  async (params, { rejectWithValue, dispatch }) => {
    const { loginType, values } = params

    try {
      if (loginType === LOGIN_TYPES.phone) {
        await loginAPI(values)
      } else if (loginType === LOGIN_TYPES.google) {
        await googleSignIn()
      }
      dispatch(setIsLoggedIn(true))
    } catch (e) {
      const error = e as Error | AxiosError
      const processedError = isAxiosError(error) ? error?.response?.data : error
      return rejectWithValue(processedError)
    }
  }
)

export const registerThunk = createAppAsyncThunk<Profile, RegisterAPI['payload']>(
  `${STATE_SLICE_NAMES.profile}/register`,
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const profile = await registerAPI(payload)
      dispatch(setProfileData(profile))
      return profile
    } catch (e) {
      const error = e as Error | AxiosError
      const processedError = isAxiosError(error) ? error?.response?.data : error
      return rejectWithValue(processedError)
    }
  }
)

export const logoutThunk = createAppAsyncThunk<void, LogoutAPI['payload']>(
  `${STATE_SLICE_NAMES.profile}/logout`,
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await logoutAPI()

      dispatch(setIsLoggedIn(false))
      dispatch(setProfileData(PROFILE_INITIAL_DATA))
    } catch (e) {
      const error = e as Error | AxiosError
      const processedError = isAxiosError(error) ? error?.response?.data : error
      return rejectWithValue(processedError)
    }
  }
)

export const forgotPasswordThunk = createAppAsyncThunk<void, SendForgotPasswordInstructionsAPI['payload']>(
  `${STATE_SLICE_NAMES.profile}/forgotPassword`,
  async (payload, { rejectWithValue }) => {
    try {
      await sendForgotPasswordInstructionsAPI(payload)
    } catch (e) {
      const error = e as Error | AxiosError
      const processedError = isAxiosError(error) ? error?.response?.data : error
      return rejectWithValue(processedError)
    }
  }
)

export const changePasswordThunk = createAppAsyncThunk<void, ChangePasswordAPI['payload']>(
  `${STATE_SLICE_NAMES.profile}/changePassword`,
  async (payload, { rejectWithValue }) => {
    try {
      await changePasswordAPI(payload)
    } catch (e) {
      const error = e as Error | AxiosError
      const processedError = isAxiosError(error) ? error?.response?.data : error
      return rejectWithValue(processedError)
    }
  }
)

export const resetPasswordThunk = createAppAsyncThunk<void, ResetPasswordAPI['payload']>(
  `${STATE_SLICE_NAMES.profile}/resetPassword`,
  async (payload, { rejectWithValue }) => {
    try {
      await resetPasswordAPI(payload)
    } catch (e) {
      const error = e as Error | AxiosError
      const processedError = isAxiosError(error) ? error?.response?.data : error
      return rejectWithValue(processedError)
    }
  }
)

export const getProfileThunk = createAppAsyncThunk<Profile, GetProfileAPI['payload']>(
  `${STATE_SLICE_NAMES.profile}/getProfile`,
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const profile = await getProfileAPI()
      dispatch(setProfileData(profile))
      return profile
    } catch (e) {
      const error = e as Error | AxiosError
      const processedError = isAxiosError(error) ? error?.response?.data : error
      return rejectWithValue(processedError)
    }
  }
)
