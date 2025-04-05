import axiosInstance from '@api/axiosInstance'
import { handleAPIError } from '@helpers/api'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import {
  processChangePasswordResponse,
  processProfileResponse,
  processRegisterResponse,
  processResetPasswordResponse,
  processSendForgotPasswordInstructionsResponse,
} from './processors'
import {
  ChangePasswordAPI,
  GetProfileAPI,
  LoginAPI,
  LogoutAPI,
  RegisterAPI,
  ResetPasswordAPI,
  SendForgotPasswordInstructionsAPI
} from './types'

// TODO: {withCredentials: true} is needed to be added to axiosInstance headers for the protected routes

export const loginAPI: LoginAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<LoginAPI['response']>>(ENDPOINTS.login, JSON.stringify(params))
  handleAPIError(data)
}

export const registerAPI: RegisterAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<RegisterAPI['response']>>(
    ENDPOINTS.register,
    JSON.stringify(params)
  )
  handleAPIError(data)
  const processedResponse = processRegisterResponse(data)
  return processedResponse
}

export const logoutAPI: LogoutAPI['api'] = async () => {
  const { data } = await axiosInstance.post<APIResponse<LogoutAPI['response']>>(ENDPOINTS.logout)
  handleAPIError(data)
}

export const sendForgotPasswordInstructionsAPI: SendForgotPasswordInstructionsAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<SendForgotPasswordInstructionsAPI['response']>>(
    ENDPOINTS.sendForgotPasswordInstructions,
    JSON.stringify(params)
  )
  handleAPIError(data)
  const processedResponse = processSendForgotPasswordInstructionsResponse(data)
  return processedResponse
}

export const changePasswordAPI: ChangePasswordAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ChangePasswordAPI['response']>>(
    ENDPOINTS.changePassword,
    JSON.stringify(params)
  )
  handleAPIError(data)
  const processedResponse = processChangePasswordResponse(data)
  return processedResponse
}

export const resetPasswordAPI: ResetPasswordAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ResetPasswordAPI['response']>>(
    ENDPOINTS.resetPassword,
    JSON.stringify(params)
  )
  handleAPIError(data)
  const processedResponse = processResetPasswordResponse(data)
  return processedResponse
}

export const getProfileAPI: GetProfileAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProfileAPI['response']>>(ENDPOINTS.getProfile)
  handleAPIError(data)
  const processedResponse = processProfileResponse(data)
  return processedResponse
}
