import { Endpoint } from '@interfaces/api'
import { Addon, AddonLine, PaidPlan, Plan } from '@interfaces/plans'

/**
 * Each paid plan's and each add-on's monthly total as Paddle would charge this visitor — a
 * pack priced for one — or null for the USD fallback.
 */
export type LocalizedPlanPrices = Record<PaidPlan | Addon, string | null>

export type GetPlanPricesAPI = Endpoint<{
  payload: void
  response: LocalizedPlanPrices
  processed: LocalizedPlanPrices
}>

/** What a checkout sells: a plan, add-ons, or both — at least one of them. */
export type CheckoutCart = { plan?: PaidPlan; addons?: AddonLine[] }

export type PostCheckoutAPI = Endpoint<{
  /** `locale` picks which `/[lang]/billing/checkout` Paddle sends the browser to. */
  payload: CheckoutCart & { locale: string }
  response: { checkoutUrl: string }
  processed: string
}>

export type PostChangePlanAPI = Endpoint<{
  /** `free` removes the plan and keeps the add-ons; with none left it is refused (`lastItem`). */
  payload: { plan: Plan }
  response: boolean
  processed: boolean
}>

export type PostAddonAPI = Endpoint<{
  /** `quantity` 0 removes the add-on; a feature is 0 or 1. */
  payload: AddonLine
  response: boolean
  processed: boolean
}>

export type PostBillingPortalAPI = Endpoint<{
  payload: void
  response: { url: string }
  processed: string
}>
