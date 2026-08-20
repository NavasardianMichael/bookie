import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import {
  processProviderProfileResponse,
  processProviderServiceResponse,
  processProvidersListResponse,
  processSingleProviderResponse,
} from './processors'
import {
  DeleteProviderServiceAPI,
  GetProviderProfileAPI,
  GetProvidersListAPI,
  GetSingleProviderAPI,
  PutProviderProfileAPI,
  PutProviderServiceAPI,
} from './types'

export const getProvidersListAPI: GetProvidersListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProvidersListAPI['response']>>(ENDPOINTS.getProvidersList)
  const processedResponse = processProvidersListResponse(data)
  return processedResponse
}

export const getSingleProviderAPI: GetSingleProviderAPI['api'] = async (args) => {
  const { data } = await axiosInstance.get<APIResponse<GetSingleProviderAPI['response']>>(
    `${ENDPOINTS.getSingleProvider}/${args.id}`
  )

  const processedResponse = processSingleProviderResponse(data)
  return processedResponse
}

export const getProviderProfileAPI: GetProviderProfileAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProviderProfileAPI['response']>>(
    `${ENDPOINTS.getProviderProfile}`
  )

  const processedResponse = processProviderProfileResponse(data)
  return processedResponse
}

export const putProviderProfileAPI: PutProviderProfileAPI['api'] = async (params) => {
  await axiosInstance.put<APIResponse<PutProviderProfileAPI['response']>>(ENDPOINTS.putProviderProfile, params, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const deleteProviderServiceAPI: DeleteProviderServiceAPI['api'] = async (args) => {
  await axiosInstance.delete<APIResponse<DeleteProviderServiceAPI['response']>>(
    `${ENDPOINTS.deleteProviderService}/${args.providerId}/services/${args.serviceId}`
  )
}

export const putProviderServiceAPI: PutProviderServiceAPI['api'] = async (params) => {
  const { providerId, service } = params
  const serviceId = service.id

  const url = serviceId
    ? `${ENDPOINTS.putProviderService}/${providerId}/services/${serviceId}`
    : `${ENDPOINTS.putProviderService}/${providerId}/services`

  const method = serviceId ? 'put' : 'post'

  const { data } = await axiosInstance.request<APIResponse<PutProviderServiceAPI['response']>>({
    url,
    method,
    data: { service },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  const processedResponse = processProviderServiceResponse(data)
  return processedResponse
}
