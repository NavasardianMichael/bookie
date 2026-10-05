import { describe, expect, it } from 'vitest'
import {
  processBillingPortalResponse,
  processCheckoutResponse,
  processPlanPricesResponse,
} from '@api/billing/processors'
import { LocalizedPlanPrices } from '@api/billing/types'
import { APIResponse } from '@interfaces/api'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

describe('processPlanPricesResponse', () => {
  it('passes the localized totals through', () => {
    const prices: LocalizedPlanPrices = { basic: '€4.59', standard: '€13.79', premium: null }
    expect(processPlanPricesResponse(envelope(prices))).toEqual(prices)
  })

  // A missing plan or a null value is "show the USD fallback", never a crash.
  it('fills every plan, null where Paddle said nothing', () => {
    expect(processPlanPricesResponse(envelope({ basic: '£3.99' } as LocalizedPlanPrices))).toEqual({
      basic: '£3.99',
      standard: null,
      premium: null,
    })
    expect(processPlanPricesResponse(envelope(null as unknown as LocalizedPlanPrices))).toEqual({
      basic: null,
      standard: null,
      premium: null,
    })
  })
})

describe('processCheckoutResponse', () => {
  it('answers the checkout URL itself', () => {
    const url = 'https://bookie.example/en/billing/checkout?_ptxn=txn_1'
    expect(processCheckoutResponse(envelope({ checkoutUrl: url }))).toBe(url)
  })
})

describe('processBillingPortalResponse', () => {
  it('answers the portal URL itself', () => {
    expect(processBillingPortalResponse(envelope({ url: 'https://customer-portal.paddle.com/x' }))).toBe(
      'https://customer-portal.paddle.com/x'
    )
  })
})
