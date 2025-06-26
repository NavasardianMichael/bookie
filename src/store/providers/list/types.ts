import { Normalized } from '@interfaces/commons'
import { SliceCommonProps } from '@interfaces/store'
import { BasicProvider } from '../profile/types'

export type ProvidersListState = {
  list: Normalized<BasicProvider>
} & SliceCommonProps

export type ProviderProfileActions = {
  setProvidersListState: (payload: Partial<ProvidersListState>) => void
  setProvidersList: (payload: Partial<ProvidersListState['list']>) => void
}
