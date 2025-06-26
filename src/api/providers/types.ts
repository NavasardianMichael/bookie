import { ProvidersListState } from '@store/providers/list/types'
import { BasicProvider } from '@store/providers/profile/types'
import { Endpoint } from '@interfaces/api'

type BasicProviderResponse = BasicProvider

export type GetProvidersListAPI = Endpoint<{
  payload: void
  response: BasicProviderResponse[]
  processed: ProvidersListState['list']
}>
