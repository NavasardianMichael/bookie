import { ADDON_ORDER } from '@constants/plans'
import {
  GetBillingPaymentsAPI,
  GetPlanPricesAPI,
  LocalizedPlanPrices,
  PostAddonAPI,
  PostBillingPortalAPI,
  PostChangePlanAPI,
  PostCheckoutAPI,
} from './types'

const NO_PRICES = {
  basic: null,
  standard: null,
  premium: null,
  ...Object.fromEntries(ADDON_ORDER.map((addon) => [addon, null])),
} as LocalizedPlanPrices

/** A missing value means "show the USD fallback", never an error — the page still prices everything. */
export const processPlanPricesResponse: GetPlanPricesAPI['processor'] = (response) => ({
  ...NO_PRICES,
  ...(response.value ?? {}),
})

export const processCheckoutResponse: PostCheckoutAPI['processor'] = (response) => response.value.checkoutUrl

export const processChangePlanResponse: PostChangePlanAPI['processor'] = (response) => response.value

export const processAddonResponse: PostAddonAPI['processor'] = (response) => response.value

export const processBillingPortalResponse: PostBillingPortalAPI['processor'] = (response) => response.value.url

export const processBillingPaymentsResponse: GetBillingPaymentsAPI['processor'] = (response) => response.value ?? []
