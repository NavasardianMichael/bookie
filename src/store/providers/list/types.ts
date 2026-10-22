import { ProvidersListQuery } from '@api/providers/types'
import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'
import { ProviderProfile, ProviderService } from '../profile/types'

export type BasicProvider = Pick<ProviderProfile, 'id' | 'basic'> & {
  /** The public page key when the provider set one — the page is `/p/<slug ?? id>` (`providerPagePath`). */
  slug?: string
}

/** The service a search matched, as its result card prints it. */
export type MatchedService = Pick<ProviderService, 'id' | 'name' | 'duration' | 'price' | 'currency'>

/**
 * One Explore result. The two match fields are present only when a service is what the
 * search found — a provider found by name, or a list with no query, carries neither.
 */
export type ProviderListItem = BasicProvider & {
  matchedService?: MatchedService
  /** How many other services matched as well; absent when none did. */
  moreMatchingServices?: number
}

/**
 * The window the API answered with, not the one that was asked for — the server clamps
 * an out-of-range `page`, so this is what the pager must render.
 */
export type ProvidersListPagination = {
  total: number
  page: number
  perPage: number
  pageCount: number
}

export type ProvidersListState = {
  list: Normalized<ProviderListItem>
  pagination: ProvidersListPagination
} & StateCommonProps

export type ProvidersListActions = {
  setProvidersListState: (payload: Partial<ProvidersListState>) => void
  setProvidersList: (payload: Partial<ProvidersListState['list']>) => void
  getProvidersList: (args?: ProvidersListQuery) => Promise<void>
}
