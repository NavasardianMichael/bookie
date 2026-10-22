import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { API_AI_TIMEOUT_MS } from '@constants/app'
import { getRuntimeTimeZone } from '@helpers/timeZone'
import { ENDPOINTS } from './endpoints'
import {
  processApplyProfileAssistantResponse,
  processDismissProfileAssistantResponse,
  processGenerateProfileAssistantResponse,
  processGetProfileAssistantStatusResponse,
} from './processors'
import {
  ApplyProfileAssistantAPI,
  DismissProfileAssistantAPI,
  GenerateProfileAssistantAPI,
  GetProfileAssistantStatusAPI,
} from './types'

export const getProfileAssistantStatusAPI: GetProfileAssistantStatusAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetProfileAssistantStatusAPI['response']>>(
    ENDPOINTS.getProfileAssistantStatus
  )
  return processGetProfileAssistantStatusResponse(data)
}

/**
 * Plain JSON, but on the model's clock rather than the default one: the API waits up to a
 * minute for Gemini, longer than `API_REQUEST_TIMEOUT_MS`. `tz` is the browser's zone, proposed
 * only to a provider who never set one.
 */
export const generateProfileAssistantAPI: GenerateProfileAssistantAPI['api'] = async ({ description, locale }) => {
  const { data } = await axiosInstance.post<APIResponse<GenerateProfileAssistantAPI['response']>>(
    ENDPOINTS.generateProfileAssistant,
    { description, locale, tz: getRuntimeTimeZone() ?? '' },
    { timeout: API_AI_TIMEOUT_MS }
  )
  return processGenerateProfileAssistantResponse(data)
}

export const applyProfileAssistantAPI: ApplyProfileAssistantAPI['api'] = async (proposal) => {
  const { data } = await axiosInstance.post<APIResponse<ApplyProfileAssistantAPI['response']>>(
    ENDPOINTS.applyProfileAssistant,
    proposal
  )
  return processApplyProfileAssistantResponse(data)
}

export const dismissProfileAssistantAPI: DismissProfileAssistantAPI['api'] = async () => {
  const { data } = await axiosInstance.post<APIResponse<DismissProfileAssistantAPI['response']>>(
    ENDPOINTS.dismissProfileAssistant
  )
  return processDismissProfileAssistantResponse(data)
}
