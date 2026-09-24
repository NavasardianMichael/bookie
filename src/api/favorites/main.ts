import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processFavoriteProviderIdsResponse, processFavoriteProvidersResponse } from './processors'
import {
  DeleteFavoriteProviderAPI,
  GetFavoriteProviderIdsAPI,
  GetFavoriteProvidersAPI,
  PutFavoriteProviderAPI,
} from './types'

/** Not `cache()`-wrapped: one page reads it once, and there is no `generateMetadata` twin. */
export const getFavoriteProvidersAPI: GetFavoriteProvidersAPI['api'] = async ({ cookie }) => {
  const { data } = await axiosInstance.get<APIResponse<GetFavoriteProvidersAPI['response']>>(
    ENDPOINTS.getFavoriteProviders,
    cookie ? { headers: { Cookie: cookie } } : undefined
  )
  return processFavoriteProvidersResponse(data)
}

export const getFavoriteProviderIdsAPI: GetFavoriteProviderIdsAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetFavoriteProviderIdsAPI['response']>>(
    ENDPOINTS.getFavoriteProviderIds
  )
  return processFavoriteProviderIdsResponse(data)
}

export const putFavoriteProviderAPI: PutFavoriteProviderAPI['api'] = async ({ providerId }) => {
  await axiosInstance.put<APIResponse<PutFavoriteProviderAPI['response']>>(
    `${ENDPOINTS.putFavoriteProvider}/${encodeURIComponent(providerId)}`
  )
}

export const deleteFavoriteProviderAPI: DeleteFavoriteProviderAPI['api'] = async ({ providerId }) => {
  await axiosInstance.delete<APIResponse<DeleteFavoriteProviderAPI['response']>>(
    `${ENDPOINTS.deleteFavoriteProvider}/${encodeURIComponent(providerId)}`
  )
}
