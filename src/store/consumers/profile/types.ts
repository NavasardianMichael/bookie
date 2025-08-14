import { BasicProvider } from '@store/providers/list/types'
import { StateCommonProps } from '@interfaces/store'

export type ConsumerProfileState = StateCommonProps & Consumer

export type ConsumerService = {
  id: string
  name: string
  description: string
}

export type Consumer = {
  id: string
  basic: {
    name: string
    phoneNumber: string
  }
  details: {
    favoriteProviders: BasicProvider[]
  }
}

export type BasicConsumer = Pick<Consumer, 'id' | 'basic'>

export type ConsumerProfileActions = {
  setConsumerProfileState: (payload: Partial<ConsumerProfileState>) => void
}
