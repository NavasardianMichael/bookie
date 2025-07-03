import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processGetCodeResponse } from './processors'
import { GetCodeByPhoneNumberAPI, ValidatePhoneNumberCodeAPI } from './types'

export const getCodeByPhoneNumberAPI: GetCodeByPhoneNumberAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetCodeByPhoneNumberAPI['response']>>(
    ENDPOINTS.getCodeByPhoneNumber
  )
  const processedResponse = processGetCodeResponse(data)
  return processedResponse
}

export const validatePhoneNumberCodeAPI: ValidatePhoneNumberCodeAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ValidatePhoneNumberCodeAPI['response']>>(
    ENDPOINTS.validatePhoneNumberCode,
    params
  )
  const processedResponse = processGetCodeResponse(data)
  return processedResponse
}
