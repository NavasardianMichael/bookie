import { cache } from 'react'
import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { paramsToQueryString } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import {
  processProviderProfileResponse,
  processProviderSeoResponse,
  processProviderServiceResponse,
  processProvidersListResponse,
  processSingleProviderResponse,
} from './processors'
import {
  DeleteProviderProfileAPI,
  DeleteProviderServiceAPI,
  GetProviderProfileAPI,
  GetProvidersListAPI,
  GetSingleProviderAPI,
  PatchProviderSeoAPI,
  PostProviderServiceAPI,
  ProviderServiceRequestPayload,
  PutProviderProfileAPI,
  PutProviderServiceAPI,
} from './types'

export const getProvidersListAPI: GetProvidersListAPI['api'] = async (query) => {
  const queryString = paramsToQueryString({ ...query })
  const { data } = await axiosInstance.get<APIResponse<GetProvidersListAPI['response']>>(
    queryString ? `${ENDPOINTS.getProvidersList}?${queryString}` : ENDPOINTS.getProvidersList
  )
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

export const deleteProviderProfileAPI: DeleteProviderProfileAPI['api'] = async () => {
  await axiosInstance.delete<APIResponse<DeleteProviderProfileAPI['response']>>(ENDPOINTS.deleteProviderProfile)
}

/**
 * The provider id is redundant with the session cookie, but it is in the route, so an
 * empty one has to fail here rather than as a `/providers//services` 404 that names
 * nothing. This fired for real: the profile store was never hydrated, so `id` was `''`.
 */
const assertProviderId = (providerId: string): string => {
  if (!providerId) throw new Error('Provider profile is not loaded yet')
  return providerId
}

/**
 * A service body is sent flat, and only as multipart when it carries a cropped image.
 *
 * Both halves are load-bearing. Nesting it as `{ service }` under a
 * `multipart/form-data` header made axios serialise the keys as `service[name]`, and
 * multer does no bracket parsing — it hands those over verbatim, so the API read every
 * field as `undefined`. And an unchanged `image` is a URL string the API has no use for:
 * it only ever takes an image as an upload, so sending one back would be noise.
 */
const toServiceRequest = (service: ProviderServiceRequestPayload) => {
  const { image, ...fields } = service
  const isFile = typeof File !== 'undefined' && image instanceof File

  return {
    body: isFile ? { ...fields, image } : fields,
    config: isFile ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
  }
}

export const postProviderServiceAPI: PostProviderServiceAPI['api'] = async (params) => {
  const providerId = assertProviderId(params.providerId)
  const { body, config } = toServiceRequest(params.service)

  const { data } = await axiosInstance.post<APIResponse<PostProviderServiceAPI['response']>>(
    `${ENDPOINTS.postProviderService}/${providerId}/services`,
    body,
    config
  )

  const processedResponse = processProviderServiceResponse(data)
  return processedResponse
}

export const putProviderServiceAPI: PutProviderServiceAPI['api'] = async (params) => {
  const providerId = assertProviderId(params.providerId)
  const { body, config } = toServiceRequest(params.service)

  const { data } = await axiosInstance.put<APIResponse<PutProviderServiceAPI['response']>>(
    `${ENDPOINTS.putProviderService}/${providerId}/services/${params.serviceId}`,
    body,
    config
  )

  const processedResponse = processProviderServiceResponse(data)
  return processedResponse
}

export const deleteProviderServiceAPI: DeleteProviderServiceAPI['api'] = async (args) => {
  const providerId = assertProviderId(args.providerId)

  await axiosInstance.delete<APIResponse<DeleteProviderServiceAPI['response']>>(
    `${ENDPOINTS.deleteProviderService}/${providerId}/services/${args.serviceId}`
  )
}

/**
 * Plain JSON, not multipart: these are four string columns and there is no `File` in
 * sight, so `toFormData`'s nested-key flattening would only be a way to lose them.
 */
export const patchProviderSeoAPI: PatchProviderSeoAPI['api'] = async (payload) => {
  const { data } = await axiosInstance.patch<APIResponse<PatchProviderSeoAPI['response']>>(
    ENDPOINTS.patchProviderSeo,
    payload
  )

  const processedResponse = processProviderSeoResponse(data)
  return processedResponse
}
