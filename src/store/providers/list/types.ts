import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'
import { ProviderProfile } from '../profile/types'

export type BasicProvider = Pick<ProviderProfile, 'id' | 'basic'>

export type ProvidersListState = {
  list: Normalized<BasicProvider>
} & StateCommonProps

export type ProvidersListActions = {
  setProvidersListState: (payload: Partial<ProvidersListState>) => void
  setProvidersList: (payload: Partial<ProvidersListState['list']>) => void
  getProvidersList: () => void
}
