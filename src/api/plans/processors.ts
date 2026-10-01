import { GetAdminProvidersAPI, GetPlansAPI, GetProviderPlanAPI, PatchAdminProviderPlanAPI } from './types'

/** Cheapest first, as the API orders it — the table must not re-sort what `PLAN_ORDER` decided. */
export const processPlansResponse: GetPlansAPI['processor'] = (response) => response.value ?? []

export const processProviderPlanResponse: GetProviderPlanAPI['processor'] = (response) => response.value

export const processAdminProvidersResponse: GetAdminProvidersAPI['processor'] = (response) => response.value

export const processAdminProviderPlanResponse: PatchAdminProviderPlanAPI['processor'] = (response) => response.value
