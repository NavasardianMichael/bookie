import { GetProviderAnalyticsAPI } from './types'

export const processProviderAnalyticsResponse: GetProviderAnalyticsAPI['processor'] = (response) => response.value
