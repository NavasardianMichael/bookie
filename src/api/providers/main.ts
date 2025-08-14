import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import {
  processProviderProfileResponse,
  processProvidersListResponse,
  processSingleProviderResponse,
} from './processors'
import { GetProviderProfileAPI, GetProvidersListAPI, GetSingleProviderAPI, PutProviderProfileAPI } from './types'

export const getProvidersListAPI: GetProvidersListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProvidersListAPI['response']>>(ENDPOINTS.getProvidersList)
  const processedResponse = processProvidersListResponse(data)
  return processedResponse
}

export const getSingleProviderAPI: GetSingleProviderAPI['api'] = async (args) => {
  const { data } = await axiosInstance.get<APIResponse<GetSingleProviderAPI['response']>>(
    `${ENDPOINTS.getSingleProvider}/${args.id}`
  )

  const processedResponse = processSingleProviderResponse(data)
  return processedResponse
}

export const getProviderProfileAPI: GetProviderProfileAPI['api'] = async (args) => {
  const { data } = await axiosInstance.get<APIResponse<GetProviderProfileAPI['response']>>(
    `${ENDPOINTS.getProviderProfile}/${args.id}`
  )

  const processedResponse = processProviderProfileResponse(data)
  return processedResponse
}

export const putProviderProfileAPI: PutProviderProfileAPI['api'] = async (params) => {
  await axiosInstance.post<APIResponse<PutProviderProfileAPI['response']>>(ENDPOINTS.putProviderProfile, params)
}
