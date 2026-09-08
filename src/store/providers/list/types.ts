import { ProvidersListQuery } from '@api/providers/types'
import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'
import { ProviderProfile } from '../profile/types'

export type BasicProvider = Pick<ProviderProfile, 'id' | 'basic'>

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
  list: Normalized<BasicProvider>
  pagination: ProvidersListPagination
} & StateCommonProps

export type ProvidersListActions = {
  setProvidersListState: (payload: Partial<ProvidersListState>) => void
  setProvidersList: (payload: Partial<ProvidersListState['list']>) => void
  getProvidersList: (args?: ProvidersListQuery) => Promise<void>
}
