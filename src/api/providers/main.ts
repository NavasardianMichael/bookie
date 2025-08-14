import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processProviderProfileResponse, processProviderResponse, processProvidersListResponse } from './processors'
import {
  GetProviderAPI,
  GetProviderProviderProfileAPI,
  GetProvidersListAPI,
  PutProviderProviderProfileAPI,
} from './types'

export const getProvidersListAPI: GetProvidersListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProvidersListAPI['response']>>(ENDPOINTS.getProvidersList)
  const processedResponse = processProvidersListResponse(data)
  return processedResponse
}

export const getProviderAPI: GetProviderAPI['api'] = async (args) => {
  const { data } = await axiosInstance.get<APIResponse<GetProviderAPI['response']>>(
    `${ENDPOINTS.getProvider}/${args.id}`
  )

  const processedResponse = processProviderResponse(data)
  return processedResponse
}

export const getProviderProfileAPI: GetProviderProviderProfileAPI['api'] = async (args) => {
  const { data } = await axiosInstance.get<APIResponse<GetProviderProviderProfileAPI['response']>>(
    `${ENDPOINTS.getProfileProfile}/${args.id}`
  )

  const processedResponse = processProviderProfileResponse(data)
  return processedResponse
}

export const putProviderProviderProfileAPI: PutProviderProviderProfileAPI['api'] = async (params) => {
  await axiosInstance.post<APIResponse<PutProviderProviderProfileAPI['response']>>(ENDPOINTS.postProfileProfile, params)
}
