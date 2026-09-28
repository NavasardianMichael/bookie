import { OrganizationsListState } from '@store/organizations/list/types'
import { BasicOrganization, Organization } from '@store/organizations/single/types'
import { Endpoint } from '@interfaces/api'

export type BasicOrganizationResponse = BasicOrganization
export type OrganizationResponse = Organization

export type GetOrganizationsListAPI = Endpoint<{
  payload: void
  response: BasicOrganizationResponse[]
  processed: OrganizationsListState['list']
}>

export type GetOrganizationAPI = Endpoint<{
  payload: Pick<Organization, 'id'>
  response: OrganizationResponse
  processed: Organization
}>

/**
 * Backs the registration Organization field's suggestions. Flat rather than normalized —
 * the result is a transient option list, not store state. `limit` caps it server-side
 * (the API allows 1–20, and answers 20 without one).
 */
export type SearchOrganizationsAPI = Endpoint<{
  payload: { query: string; limit?: number }
  response: BasicOrganizationResponse[]
  processed: BasicOrganization[]
}>

/**
 * The organizations a new one called `name` would probably duplicate — asked before a
 * registration creates one, so the provider can join an existing one instead.
 */
export type FindSimilarOrganizationsAPI = Endpoint<{
  payload: { name: string }
  response: BasicOrganizationResponse[]
  processed: BasicOrganization[]
}>
