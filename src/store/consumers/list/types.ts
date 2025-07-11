import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'
import { BasicConsumer } from '../profile/types'

export type ConsumersListState = StateCommonProps & {
  list: Normalized<BasicConsumer>
}

export type ConsumersListActions = {
  setConsumersListState: (payload: Partial<ConsumersListState>) => void
  setConsumersList: (payload: Partial<ConsumersListState['list']>) => void
}
