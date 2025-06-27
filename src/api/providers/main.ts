import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processProvidersListResponse } from './processors'
import { GetProvidersListAPI } from './types'

export const getProvidersListAPI: GetProvidersListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProvidersListAPI['response']>>(ENDPOINTS.getProvidersList)
  console.log({ data })

  // handleAPIError(data)
  const processedResponse = processProvidersListResponse(data)
  return processedResponse
}
