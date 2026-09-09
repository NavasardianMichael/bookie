import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { paramsToQueryString } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import { processProviderAnalyticsResponse } from './processors'
import { GetProviderAnalyticsAPI } from './types'

/**
 * The browser's IANA timezone, sent so the server buckets days, weekdays and hours the
 * way the person reading the page experiences them. `startAt` is UTC and `Provider` has
 * no timezone column, so without this an evening booking lands on the wrong day for
 * anyone away from Greenwich. Guarded, and the server falls back to UTC.
 */
const currentTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    return ''
  }
}

export const getProviderAnalyticsAPI: GetProviderAnalyticsAPI['api'] = async (query) => {
  const queryString = paramsToQueryString({ ...query, tz: currentTimeZone() })
  const { data } = await axiosInstance.get<APIResponse<GetProviderAnalyticsAPI['response']>>(
    queryString ? `${ENDPOINTS.getProviderAnalytics}?${queryString}` : ENDPOINTS.getProviderAnalytics
  )
  return processProviderAnalyticsResponse(data)
}
