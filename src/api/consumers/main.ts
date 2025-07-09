import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processConsumersListResponse } from './processors'
import { GetConsumersListAPI } from './types'

export const getConsumersAPI: GetConsumersListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetConsumersListAPI['response']>>(ENDPOINTS.getConsumersList)
  const processedResponse = processConsumersListResponse(data)
  return processedResponse
}
