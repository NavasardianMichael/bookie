import { GetSingleProviderAPI } from '@api/providers/types'
import { StateCommonProps } from '@interfaces/store'
import { ProviderProfile } from '../profile/types'

export type SingleProvider = Pick<ProviderProfile, 'id' | 'basic' | 'details' | 'services'>

export type SingleProviderState = StateCommonProps & SingleProvider

export type SingleProviderActions = {
  setSingleProviderState: (payload: Partial<SingleProviderState>) => void
  getSingleProvider: (args: GetSingleProviderAPI['payload']) => void
}
