import { Endpoint } from '@interfaces/api'
import {
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

export type GetProviderPlanAPI = Endpoint<{
  payload: void
  response: ProviderPlanWithUsage
  processed: ProviderPlanWithUsage
}>

/* --- Admin ---------------------------------------------------------------- */

export type AdminProvidersQuery = Partial<{
  /** Matches first name, last name, account email or slug. */
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
