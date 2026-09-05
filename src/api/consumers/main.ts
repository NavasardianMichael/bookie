import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processConsumerProfileResponse, processPutConsumerProfileResponse } from './processors'
import { GetConsumerProfileAPI, PutConsumerProfileAPI } from './types'

export const getConsumerProfileAPI: GetConsumerProfileAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetConsumerProfileAPI['response']>>(
    ENDPOINTS.getConsumerProfile
  )
  return processConsumerProfileResponse(data)
}

export const putConsumerProfileAPI: PutConsumerProfileAPI['api'] = async (params) => {
  const { data } = await axiosInstance.put<APIResponse<PutConsumerProfileAPI['response']>>(
    ENDPOINTS.putConsumerProfile,
    params
  )
  return processPutConsumerProfileResponse(data)
}
