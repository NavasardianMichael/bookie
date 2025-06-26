import { ConsumersListState } from '@store/consumers/list/types'
import { BasicConsumer } from '@store/consumers/profile/types'
import { Endpoint } from '@interfaces/api'

type BasicConsumerResponse = BasicConsumer

export type GetConsumersListAPI = Endpoint<{
  payload: void
  response: BasicConsumerResponse[]
  processed: ConsumersListState['list']
}>
