import { PLANS } from '@constants/plans'

export type Plan = (typeof PLANS)[keyof typeof PLANS]

/**
 * What a plan allows, exactly as the API's `services/plans.ts` declares it. `null` is
 * unlimited throughout — JSON has no `Infinity`, and `0` would read as "none".
 */
export type Entitlements = {
  /** Services with `active: true`; inactive ones never count. */
  maxActiveServices: number | null
  /** Non-cancelled bookings created in the current UTC calendar month. */
  maxBookingsPerMonth: number | null
  /** How far back analytics may look, from now. */
  analyticsHistoryDays: number | null
  /** May set or change the vanity `/p/<slug>`. */
  customSlug: boolean
}

/** One row of `GET /plans`, cheapest first. No price yet — plans are assigned by an admin. */
export type PlanCatalogueEntry = {
  id: Plan
  entitlements: Entitlements
}

/**
 * A provider's plan as its owner sees it. `plan` is what was assigned; `effectivePlan` is
 * what applies now, which is `free` once `planExpiresAt` has passed. `entitlements` are
 * the effective plan's, so the client never re-derives them.
 */
export type ProviderPlan = {
  plan: Plan
  effectivePlan: Plan
  /** ISO instant. Absent means the plan has no end. */
  planExpiresAt?: string
  entitlements: Entitlements
}

/** This month's usage against the limits. The period is the UTC calendar month, end exclusive. */
export type PlanUsage = {
  activeServices: number
  bookingsThisMonth: number
  periodStart: string
  periodEnd: string
}

export type ProviderPlanWithUsage = ProviderPlan & { usage: PlanUsage }

/** A row of the admin plan screen — `GET /admin/providers`. */
export type AdminProvider = {
  id: string
  name: string
  email: string
  slug?: string
  listed: boolean
  plan: Plan
  effectivePlan: Plan
  planExpiresAt?: string
}

export type AdminProvidersList = {
  items: AdminProvider[]
  total: number
  page: number
  perPage: number
  pageCount: number
}
