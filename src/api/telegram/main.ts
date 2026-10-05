import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processTelegramLinkResponse, processTelegramStatusResponse, processTelegramUnlinkResponse } from './processors'
import { DeleteTelegramLinkAPI, GetTelegramStatusAPI, PostTelegramLinkAPI } from './types'

export const getTelegramStatusAPI: GetTelegramStatusAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetTelegramStatusAPI['response']>>(ENDPOINTS.getStatus)
  return processTelegramStatusResponse(data)
}

export const postTelegramLinkAPI: PostTelegramLinkAPI['api'] = async () => {
  const { data } = await axiosInstance.post<APIResponse<PostTelegramLinkAPI['response']>>(ENDPOINTS.link)
  return processTelegramLinkResponse(data)
}

export const deleteTelegramLinkAPI: DeleteTelegramLinkAPI['api'] = async () => {
  const { data } = await axiosInstance.delete<APIResponse<DeleteTelegramLinkAPI['response']>>(ENDPOINTS.link)
  return processTelegramUnlinkResponse(data)
}
