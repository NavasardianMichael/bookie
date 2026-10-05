import { describe, expect, it } from 'vitest'
import { processPlansResponse, processProviderPlanResponse } from '@api/plans/processors'
import { APIResponse } from '@interfaces/api'
import { Entitlements, Plan, PlanCatalogueEntry, ProviderPlanWithUsage } from '@interfaces/plans'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const entitlements = (maxActiveServices: number | null): Entitlements => ({
  maxActiveServices,
  maxBookingsPerMonth: null,
  analyticsHistoryDays: null,
  customSlug: true,
  telegramNotifications: true,
  calendarFeed: true,
  removeBranding: true,
})

const entry = (id: Plan, maxActiveServices: number | null, amountCents = 0): PlanCatalogueEntry => ({
  id,
  entitlements: entitlements(maxActiveServices),
  price: { amountCents, currency: 'USD', interval: 'month' },
  purchasable: amountCents > 0,
})

describe('processPlansResponse', () => {
  // The API orders the catalogue cheapest first; the table renders it as it comes.
  it('keeps the API order', () => {
    const plans: PlanCatalogueEntry[] = [entry('free', 3), entry('premium', null, 2499), entry('basic', 10, 499)]
    expect(processPlansResponse(envelope(plans)).map(({ id }) => id)).toEqual(['free', 'premium', 'basic'])
  })

  // `null` is unlimited, and must survive as `null` rather than becoming 0 ("none").
  it('keeps an unlimited limit as null', () => {
    const [premium] = processPlansResponse(envelope([entry('premium', null, 2499)]))
    expect(premium.entitlements.maxActiveServices).toBeNull()
  })

  // The price is a display fallback in cents; it must arrive untouched for the table to format.
  it('keeps each plan’s price and whether it can be bought', () => {
    const [basic] = processPlansResponse(envelope([entry('basic', 10, 499)]))
    expect(basic.price).toEqual({ amountCents: 499, currency: 'USD', interval: 'month' })
    expect(basic.purchasable).toBe(true)
  })

  it('reads a null value as an empty catalogue rather than throwing', () => {
    expect(processPlansResponse(envelope(null as unknown as PlanCatalogueEntry[]))).toEqual([])
  })
})

describe('processProviderPlanResponse', () => {
  it('passes the plan, its limits and this month’s usage through untouched', () => {
    const value: ProviderPlanWithUsage = {
      plan: 'basic',
      effectivePlan: 'free',
      planExpiresAt: '2026-09-01T00:00:00.000Z',
      entitlements: entitlements(3),
      billing: { status: 'active', periodEndsAt: '2026-10-01T00:00:00.000Z', manageable: true },
      usage: {
        activeServices: 2,
        bookingsThisMonth: 41,
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-10-01T00:00:00.000Z',
      },
    }
    expect(processProviderPlanResponse(envelope(value))).toEqual(value)
  })
})
