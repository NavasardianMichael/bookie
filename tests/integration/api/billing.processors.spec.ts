import { describe, expect, it } from 'vitest'
import {
  processAddonResponse,
  processBillingPortalResponse,
  processCheckoutResponse,
  processPlanPricesResponse,
} from '@api/billing/processors'
import { LocalizedPlanPrices } from '@api/billing/types'
import { APIResponse } from '@interfaces/api'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

/** Every key the prices map carries: the paid plans and every add-on. */
const NONE: LocalizedPlanPrices = {
  basic: null,
  standard: null,
  premium: null,
  customSlug: null,
  telegramNotifications: null,
  calendarFeed: null,
  removeBranding: null,
  extraServices: null,
  extraBookings: null,
}

describe('processPlanPricesResponse', () => {
  it('passes the localized totals through, plans and add-ons alike', () => {
    const prices: LocalizedPlanPrices = { ...NONE, basic: '€4.59', standard: '€13.79', customSlug: '€1.89' }
    expect(processPlanPricesResponse(envelope(prices))).toEqual(prices)
  })

  // A missing key or a null value is "show the USD fallback", never a crash.
  it('fills every plan and add-on, null where Paddle said nothing', () => {
    expect(processPlanPricesResponse(envelope({ basic: '£3.99' } as LocalizedPlanPrices))).toEqual({ ...NONE, basic: '£3.99' })
    expect(processPlanPricesResponse(envelope(null as unknown as LocalizedPlanPrices))).toEqual(NONE)
  })
})

describe('processCheckoutResponse', () => {
  it('answers the checkout URL itself', () => {
    const url = 'https://bookie.example/en/billing/checkout?_ptxn=txn_1'
    expect(processCheckoutResponse(envelope({ checkoutUrl: url }))).toBe(url)
  })
})

describe('processAddonResponse', () => {
  it('answers whether Paddle accepted the change', () => {
    expect(processAddonResponse(envelope(true))).toBe(true)
  })
})

describe('processBillingPortalResponse', () => {
  it('answers the portal URL itself', () => {
    expect(processBillingPortalResponse(envelope({ url: 'https://customer-portal.paddle.com/x' }))).toBe(
      'https://customer-portal.paddle.com/x'
    )
  })
})
