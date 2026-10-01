import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { paramsToQueryString } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import {
  processAdminProviderPlanResponse,
  processAdminProvidersResponse,
  processPlansResponse,
  processProviderPlanResponse,
} from './processors'
import { GetAdminProvidersAPI, GetPlansAPI, GetProviderPlanAPI, PatchAdminProviderPlanAPI } from './types'

export const getPlansAPI: GetPlansAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetPlansAPI['response']>>(ENDPOINTS.getPlans)
  return processPlansResponse(data)
}

export const getProviderPlanAPI: GetProviderPlanAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProviderPlanAPI['response']>>(ENDPOINTS.getProviderPlan)
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
