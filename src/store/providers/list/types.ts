import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'
import { BasicProvider } from '../profile/types'

export type ProvidersListState = {
  list: Normalized<BasicProvider>
} & StateCommonProps

export type ProviderProfileActions = {
  setProvidersListState: (payload: Partial<ProvidersListState>) => void
  setProvidersList: (payload: Partial<ProvidersListState['list']>) => void
  getProvidersList: () => void
}
