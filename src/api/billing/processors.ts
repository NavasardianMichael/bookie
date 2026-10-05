import { GetPlanPricesAPI, PostBillingPortalAPI, PostChangePlanAPI, PostCheckoutAPI } from './types'

const NO_PRICES = { basic: null, standard: null, premium: null }

/** A missing value means "show the USD fallback", never an error — the page still prices every plan. */
export const processPlanPricesResponse: GetPlanPricesAPI['processor'] = (response) => ({
  ...NO_PRICES,
  ...(response.value ?? {}),
})

export const processCheckoutResponse: PostCheckoutAPI['processor'] = (response) => response.value.checkoutUrl

export const processChangePlanResponse: PostChangePlanAPI['processor'] = (response) => response.value

export const processBillingPortalResponse: PostBillingPortalAPI['processor'] = (response) => response.value.url
