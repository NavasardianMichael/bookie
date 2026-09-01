import { cache } from 'react'
import { axiosInstance } from '@api/axiosInstance'
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

/** Dedupes generateMetadata + page fetches within a single request. */
const fetchOrganization = cache(async (id: string) => {
  const { data } = await axiosInstance.get<APIResponse<GetOrganizationAPI['response']>>(
    `${ENDPOINTS.getOrganization}/${id}`
  )
  return processOrganizationResponse(data)
})

export const getOrganizationAPI: GetOrganizationAPI['api'] = async (args) => fetchOrganization(args.id)
