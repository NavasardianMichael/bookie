import { Normalized } from '@interfaces/commons'
import { Provider } from '../profile/types'

export type ProvidersListSlice = {
  list: Normalized<Provider>
}

export type ProviderProfileActionPayloads = {
  setProvidersList: Partial<ProvidersListSlice>
}
