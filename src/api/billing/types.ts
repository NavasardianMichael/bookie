import { Endpoint } from '@interfaces/api'
import { PaidPlan } from '@interfaces/plans'

/** Each paid plan's monthly total as Paddle would charge this visitor, or null for the USD fallback. */
export type LocalizedPlanPrices = Record<PaidPlan, string | null>

export type GetPlanPricesAPI = Endpoint<{
  payload: void
  response: LocalizedPlanPrices
  processed: LocalizedPlanPrices
}>

export type PostCheckoutAPI = Endpoint<{
  /** `locale` picks which `/[lang]/billing/checkout` Paddle sends the browser to. */
  payload: { plan: PaidPlan; locale: string }
  response: { checkoutUrl: string }
  processed: string
}>

export type PostChangePlanAPI = Endpoint<{
  payload: { plan: PaidPlan }
  response: boolean
  processed: boolean
}>

export type PostBillingPortalAPI = Endpoint<{
  payload: void
  response: { url: string }
  processed: string
}>
