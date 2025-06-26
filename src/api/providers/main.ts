import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { handleAPIError } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import { processProvidersListResponse } from './processors'
import { GetProvidersListAPI } from './types'

export const getProvidersAPI: GetProvidersListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProvidersListAPI['response']>>(ENDPOINTS.getProvidersList)
  handleAPIError(data)
  const processedResponse = processProvidersListResponse(data)
  return processedResponse
}
