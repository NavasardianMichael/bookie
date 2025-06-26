import { BasicProvider } from '@store/providers/profile/types'
import { SliceCommonProps } from '@interfaces/store'

export type ConsumerProfileSlice = SliceCommonProps & {
  info: Consumer
}

export type ConsumerService = {
  id: string
  name: string
  description: string
}

export type Consumer = BasicConsumer & {
  favoriteProviders: BasicProvider[]
}

export type BasicConsumer = {
  id: string
  name: string
}

export type ConsumerProfileActionPayloads = {
  setConsumerProfileSlice: Partial<ConsumerProfileSlice>
  setConsumerProfileInfo: Partial<ConsumerProfileSlice['info']>
}
