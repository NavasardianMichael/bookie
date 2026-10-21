import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processDirectoryPresenceResponse } from './processors'
import { GetDirectoryPresenceAPI } from './types'

export const getDirectoryPresenceAPI: GetDirectoryPresenceAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetDirectoryPresenceAPI['response']>>(
    ENDPOINTS.getDirectoryPresence
  )
  return processDirectoryPresenceResponse(data)
}
