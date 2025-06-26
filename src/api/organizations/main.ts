import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { handleAPIError } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import { processOrganizationsListResponse } from './processors'
import { GetOrganizationsListAPI } from './types'

export const getOrganizationsAPI: GetOrganizationsListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetOrganizationsListAPI['response']>>(
    ENDPOINTS.getOrganizationsList
  )
  handleAPIError(data)
  const processedResponse = processOrganizationsListResponse(data)
  return processedResponse
}
