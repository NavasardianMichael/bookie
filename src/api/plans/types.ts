import { Endpoint } from '@interfaces/api'
import {
  AddonCatalogueEntry,
  AddonLine,
  AdminProvider,
  AdminProvidersList,
  Plan,
  PlanCatalogueEntry,
  ProviderPlanWithUsage,
} from '@interfaces/plans'

export type GetPlansAPI = Endpoint<{
  payload: void
  response: PlanCatalogueEntry[]
  processed: PlanCatalogueEntry[]
}>

export type GetAddonsAPI = Endpoint<{
  payload: void
  response: AddonCatalogueEntry[]
  processed: AddonCatalogueEntry[]
}>

export type GetProviderPlanAPI = Endpoint<{
  /** `cookie` is how a Server Component forwards the session. The browser call omits it. */
  payload: { cookie?: string } | void
  response: ProviderPlanWithUsage
  processed: ProviderPlanWithUsage
}>

/* --- Admin ---------------------------------------------------------------- */

export type AdminProvidersQuery = Partial<{
  /** Matches the name, account email or slug. */
  q: string
  page: number
  perPage: number
}>

export type GetAdminProvidersAPI = Endpoint<{
  payload: AdminProvidersQuery | void
  response: AdminProvidersList
  processed: AdminProvidersList
}>

export type PatchAdminProviderPlanAPI = Endpoint<{
  payload: {
    id: AdminProvider['id']
    plan: Plan
    /** ISO instant in the future, or `null` for no end. Dropped by the API for `free`. */
    planExpiresAt: string | null
  }
  response: AdminProvider
  processed: AdminProvider
}>

export type PatchAdminProviderAddonsAPI = Endpoint<{
  payload: {
    id: AdminProvider['id']
    /** The whole admin grant, replacing the previous one; `[]` withdraws it. */
    addons: AddonLine[]
    /** ISO instant in the future, or `null` for no end. */
    expiresAt: string | null
  }
  response: AdminProvider
  processed: AdminProvider
}>
