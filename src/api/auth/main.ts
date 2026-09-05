import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import {
  processGetCodeResponse,
  processGetMeResponse,
  processLogoutResponse,
  processValidatePhoneNumberCodeResponse,
} from './processors'
import { GetCodeByPhoneNumberAPI, GetMeAPI, LogoutAPI, ValidatePhoneNumberCodeAPI } from './types'

export const getCodeByPhoneNumberAPI: GetCodeByPhoneNumberAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<GetCodeByPhoneNumberAPI['response']>>(
    ENDPOINTS.getCodeByPhoneNumber,
    params
  )
  const processedResponse = processGetCodeResponse(data)
  return processedResponse
}

export const validatePhoneNumberCodeAPI: ValidatePhoneNumberCodeAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ValidatePhoneNumberCodeAPI['response']>>(
    ENDPOINTS.validatePhoneNumberCode,
    params
  )
  const processedResponse = processValidatePhoneNumberCodeResponse(data)
  return processedResponse
}

export const getMeAPI: GetMeAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetMeAPI['response']>>(ENDPOINTS.me)
  const processedResponse = processGetMeResponse(data)
  return processedResponse
}

export const logoutAPI: LogoutAPI['api'] = async () => {
  const { data } = await axiosInstance.post<APIResponse<LogoutAPI['response']>>(ENDPOINTS.logout)
  const processedResponse = processLogoutResponse(data)
  return processedResponse
}
