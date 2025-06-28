import { ProvidersListState } from '@store/providers/list/types'
import { BasicProvider, Provider } from '@store/providers/profile/types'
import { Endpoint } from '@interfaces/api'

export type ProviderResponse = Provider
export type BasicProviderResponse = BasicProvider

export type GetProvidersListAPI = Endpoint<{
  payload: void
  response: BasicProviderResponse[]
  processed: ProvidersListState['list']
}>

export type GetProviderAPI = Endpoint<{
  payload: Pick<Provider, 'id'>
  response: ProviderResponse
  processed: Provider
}>
