import { Normalized } from '@interfaces/commons'
import { SliceCommonProps } from '@interfaces/store'
import { Provider } from '../profile/types'

export type ProvidersListSlice = {
  list: Normalized<Provider>
} & SliceCommonProps

export type ProviderProfileActionPayloads = {
  setProvidersList: Partial<ProvidersListSlice['list']>
}
