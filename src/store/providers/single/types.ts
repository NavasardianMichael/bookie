import { GetProviderAPI } from '@api/providers/types'
import { StateCommonProps } from '@interfaces/store'
import { Provider } from '../profile/types'

export type ProviderState = StateCommonProps & Provider

export type ProviderActions = {
  setProviderState: (payload: Partial<ProviderState>) => void
  getProvider: (args: GetProviderAPI['payload']) => void
}
