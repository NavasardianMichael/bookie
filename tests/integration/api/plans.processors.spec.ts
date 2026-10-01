import { describe, expect, it } from 'vitest'
import { processPlansResponse, processProviderPlanResponse } from '@api/plans/processors'
import { APIResponse } from '@interfaces/api'
import { Entitlements, PlanCatalogueEntry, ProviderPlanWithUsage } from '@interfaces/plans'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const entitlements = (maxActiveServices: number | null): Entitlements => ({
  maxActiveServices,
  maxBookingsPerMonth: null,
  analyticsHistoryDays: null,
  customSlug: true,
})

describe('processPlansResponse', () => {
  // The API orders the catalogue cheapest first; the table renders it as it comes.
  it('keeps the API order', () => {
    const plans: PlanCatalogueEntry[] = [
      { id: 'free', entitlements: entitlements(3) },
      { id: 'premium', entitlements: entitlements(null) },
      { id: 'basic', entitlements: entitlements(10) },
    ]
    expect(processPlansResponse(envelope(plans)).map(({ id }) => id)).toEqual(['free', 'premium', 'basic'])
  })

  // `null` is unlimited, and must survive as `null` rather than becoming 0 ("none").
  it('keeps an unlimited limit as null', () => {
    const [premium] = processPlansResponse(envelope([{ id: 'premium', entitlements: entitlements(null) }]))
    expect(premium.entitlements.maxActiveServices).toBeNull()
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
