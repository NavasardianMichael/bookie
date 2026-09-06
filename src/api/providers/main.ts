import { cache } from 'react'
import { axiosInstance } from '@api/axiosInstance'
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

/** Dedupes generateMetadata + page fetches within a single request. */
const fetchSingleProvider = cache(async (id: string, cookie: string) => {
  const { data } = await axiosInstance.get<APIResponse<GetSingleProviderAPI['response']>>(
    `${ENDPOINTS.getSingleProvider}/${id}`,
    cookie ? { headers: { Cookie: cookie } } : undefined
  )
  return processSingleProviderResponse(data)
})

export const getSingleProviderAPI: GetSingleProviderAPI['api'] = async (args) =>
  fetchSingleProvider(args.id, args.cookie ?? '')

export const getProviderProfileAPI: GetProviderProfileAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProviderProfileAPI['response']>>(
    `${ENDPOINTS.getProviderProfile}`
  )

  const processedResponse = processProviderProfileResponse(data)
  return processedResponse
}

export const putProviderProfileAPI: PutProviderProfileAPI['api'] = async (params) => {
  const hasFile =
    (typeof File !== 'undefined' && params.image instanceof File) ||
    (Array.isArray(params.gallery) && params.gallery.some((g) => typeof File !== 'undefined' && g instanceof File))

  const { data } = await axiosInstance.put<APIResponse<PutProviderProfileAPI['response']>>(
    ENDPOINTS.putProviderProfile,
    hasFile
      ? {
          ...params,
          weekSchedule: params.weekSchedule ? JSON.stringify(params.weekSchedule) : undefined,
          categoryIds: params.categoryIds ? JSON.stringify(params.categoryIds) : undefined,
          emailNotificationPrefs: params.emailNotificationPrefs
            ? JSON.stringify(params.emailNotificationPrefs)
            : undefined,
          paymentInfo: params.paymentInfo !== undefined ? JSON.stringify(params.paymentInfo) : undefined,
        }
      : params,
    hasFile
      ? {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      : undefined
  )
  return processProviderProfileResponse(data)
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
