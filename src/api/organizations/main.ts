import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processOrganizationResponse, processOrganizationsListResponse } from './processors'
import { GetOrganizationAPI, GetOrganizationsListAPI } from './types'

export const getOrganizationsListAPI: GetOrganizationsListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetOrganizationsListAPI['response']>>(
    ENDPOINTS.getOrganizationsList
  )
  const processedResponse = processOrganizationsListResponse(data)
  return processedResponse
}

export const getOrganizationAPI: GetOrganizationAPI['api'] = async (args) => {
  console.log('Fetching organization with ID:', `${ENDPOINTS.getOrganization}/${args.id}`)

  const { data } = await axiosInstance.get<APIResponse<GetOrganizationAPI['response']>>(
    `${ENDPOINTS.getOrganization}/${args.id}`
  )

  const processedResponse = processOrganizationResponse(data)
  return processedResponse
}
