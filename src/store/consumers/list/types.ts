import { Normalized } from '@interfaces/commons'
import { SliceCommonProps } from '@interfaces/store'
import { Consumer } from '../profile/types'

export type ConsumersListSlice = SliceCommonProps & {
  list: Normalized<Consumer>
}

export type ConsumersListActionPayloads = {
  setConsumersListSlice: Partial<ConsumersListSlice>
  setConsumersList: Partial<ConsumersListSlice['list']>
}
