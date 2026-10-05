import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import {
  processBillingPortalResponse,
  processChangePlanResponse,
  processCheckoutResponse,
  processPlanPricesResponse,
} from './processors'
import { GetPlanPricesAPI, PostBillingPortalAPI, PostChangePlanAPI, PostCheckoutAPI } from './types'

export const getPlanPricesAPI: GetPlanPricesAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetPlanPricesAPI['response']>>(ENDPOINTS.getPrices)
  return processPlanPricesResponse(data)
}

export const postCheckoutAPI: PostCheckoutAPI['api'] = async (payload) => {
  const { data } = await axiosInstance.post<APIResponse<PostCheckoutAPI['response']>>(ENDPOINTS.postCheckout, payload)
  return processCheckoutResponse(data)
}

export const postChangePlanAPI: PostChangePlanAPI['api'] = async (payload) => {
  const { data } = await axiosInstance.post<APIResponse<PostChangePlanAPI['response']>>(ENDPOINTS.postChangePlan, payload)
  return processChangePlanResponse(data)
}

export const postBillingPortalAPI: PostBillingPortalAPI['api'] = async () => {
  const { data } = await axiosInstance.post<APIResponse<PostBillingPortalAPI['response']>>(ENDPOINTS.postPortal)
  return processBillingPortalResponse(data)
}
