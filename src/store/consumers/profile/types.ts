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
    /** Stored separately from `lastName` — the DB never holds a joined name. */
    firstName: string
    lastName: string
    phoneNumber: string
    email?: string
  }
  details: {
    favoriteProviders: BasicProvider[]
  }
}

export type BasicConsumer = Pick<Consumer, 'id' | 'basic'>

export type ConsumerProfileActions = {
  setConsumerProfileState: (payload: Partial<ConsumerProfileState>) => void
}
