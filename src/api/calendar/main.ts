import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processCalendarFeedResponse, processRotateCalendarFeedResponse } from './processors'
import { GetCalendarFeedAPI, RotateCalendarFeedAPI } from './types'

export const getCalendarFeedAPI: GetCalendarFeedAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetCalendarFeedAPI['response']>>(ENDPOINTS.getCalendarFeed)
  return processCalendarFeedResponse(data)
}

export const rotateCalendarFeedAPI: RotateCalendarFeedAPI['api'] = async () => {
  const { data } = await axiosInstance.post<APIResponse<RotateCalendarFeedAPI['response']>>(ENDPOINTS.rotateCalendarFeed)
  return processRotateCalendarFeedResponse(data)
}
