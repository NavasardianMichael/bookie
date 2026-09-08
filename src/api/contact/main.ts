import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processPostContactMessageResponse } from './processors'
import { PostContactMessageAPI } from './types'

export const postContactMessageAPI: PostContactMessageAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<PostContactMessageAPI['response']>>(
    ENDPOINTS.postContactMessage,
    params
  )
  return processPostContactMessageResponse(data)
}
