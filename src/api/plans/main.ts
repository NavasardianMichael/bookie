import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { paramsToQueryString } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import {
  processAddonsResponse,
  processAdminProviderAddonsResponse,
  processAdminProviderPlanResponse,
  processAdminProvidersResponse,
  processPlansResponse,
  processProviderPlanResponse,
} from './processors'
import {
  GetAddonsAPI,
  GetAdminProvidersAPI,
  GetPlansAPI,
  GetProviderPlanAPI,
  PatchAdminProviderAddonsAPI,
  PatchAdminProviderPlanAPI,
} from './types'

export const getPlansAPI: GetPlansAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetPlansAPI['response']>>(ENDPOINTS.getPlans)
  return processPlansResponse(data)
}

export const getAddonsAPI: GetAddonsAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetAddonsAPI['response']>>(ENDPOINTS.getAddons)
  return processAddonsResponse(data)
}

export const getProviderPlanAPI: GetProviderPlanAPI['api'] = async (params) => {
  const cookie = params?.cookie
  const { data } = await axiosInstance.get<APIResponse<GetProviderPlanAPI['response']>>(
    ENDPOINTS.getProviderPlan,
    cookie ? { headers: { Cookie: cookie } } : undefined
  )
  return processProviderPlanResponse(data)
}

/* --- Admin ---------------------------------------------------------------- */

export const getAdminProvidersAPI: GetAdminProvidersAPI['api'] = async (query) => {
  const queryString = paramsToQueryString({ ...query })
  const { data } = await axiosInstance.get<APIResponse<GetAdminProvidersAPI['response']>>(
    queryString ? `${ENDPOINTS.getAdminProviders}?${queryString}` : ENDPOINTS.getAdminProviders
  )
  return processAdminProvidersResponse(data)
}

export const patchAdminProviderPlanAPI: PatchAdminProviderPlanAPI['api'] = async ({ id, ...body }) => {
  const { data } = await axiosInstance.patch<APIResponse<PatchAdminProviderPlanAPI['response']>>(
    `${ENDPOINTS.patchAdminProviderPlan}/${id}/plan`,
    body
  )
  return processAdminProviderPlanResponse(data)
}

export const patchAdminProviderAddonsAPI: PatchAdminProviderAddonsAPI['api'] = async ({ id, ...body }) => {
  const { data } = await axiosInstance.patch<APIResponse<PatchAdminProviderAddonsAPI['response']>>(
    `${ENDPOINTS.patchAdminProviderAddons}/${id}/addons`,
    body
  )
  return processAdminProviderAddonsResponse(data)
}
