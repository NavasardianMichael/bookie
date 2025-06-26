import { GetConsumersListAPI } from './types'

export const processConsumersListResponse: GetConsumersListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, consumer) => {
      acc.byId[consumer.id] = consumer
      acc.allIds.push(consumer.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetConsumersListAPI['processed']
  )
}
