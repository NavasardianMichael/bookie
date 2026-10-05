import { describe, expect, it } from 'vitest'
// Aliased web constants beside relative server modules: each test here pins an agreement
// between the two packages, which share no type (tests/CLAUDE.md).
import { BILLING_ERROR_CODES } from '@constants/billing'
import { ROUTES } from '@constants/routes'
import { BILLING_ERROR } from '../../../server/src/lib/billing-errors'
import {
  BILLING_CHECKOUT_PATH,
  BOOKINGS_PATH,
  buildBillingCheckoutUrl,
  buildBookingsUrl,
} from '../../../server/src/lib/return-path'

/**
 * Billing's cross-package agreements. A rename on one side alone typechecks and ships: a
 * checkout refused as "already subscribed" falls back to a generic error instead of going
 * to the Plan tab, or Paddle sends a paying provider to a 404.
 */
describe('the billing error codes', () => {
  it('are numbered the same on both sides of the wire', () => {
    expect(BILLING_ERROR_CODES).toEqual(BILLING_ERROR)
  })
})

describe('the checkout page link', () => {
  it('is the route that loads Paddle.js', () => {
    expect(BILLING_CHECKOUT_PATH).toBe(ROUTES.billingCheckout)
  })

  // Paddle appends `?_ptxn=…` to exactly this URL, so it must carry no query of its own.
  it('builds an absolute URL with one locale segment and no query', () => {
    expect(buildBillingCheckoutUrl('https://bookie.example/', 'de')).toBe('https://bookie.example/de/billing/checkout')
  })
})

describe('the bookings link in provider notices', () => {
  it('points at the route that actually exists', () => {
    expect(BOOKINGS_PATH).toBe(ROUTES.bookings)
    expect(buildBookingsUrl('https://bookie.example', 'en')).toBe('https://bookie.example/en/bookings')
  })
})
