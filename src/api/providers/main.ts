import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processProviderResponse, processProvidersListResponse } from './processors'
import { GetProviderAPI, GetProvidersListAPI } from './types'

export const getProvidersListAPI: GetProvidersListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProvidersListAPI['response']>>(ENDPOINTS.getProvidersList)
  const processedResponse = processProvidersListResponse(data)
  return processedResponse
}

export const getProviderAPI: GetProviderAPI['api'] = async (args) => {
  debugger
  const { data } = await axiosInstance.get<APIResponse<GetProviderAPI['response']>>(
    `${ENDPOINTS.getBasicProvider}/${args.id}`
  )
  const processedResponse = processProviderResponse(data)
  return processedResponse
}
