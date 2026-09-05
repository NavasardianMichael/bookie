import { BasicProvider } from '@store/providers/list/types'
import { PhoneNumber } from '@interfaces/app'
import { ConsumerEmailNotificationPrefs, PaymentInfo } from '@interfaces/settings'
import { StateCommonProps } from '@interfaces/store'

export type ConsumerProfileState = StateCommonProps & Consumer

export type Consumer = {
  id: string
  basic: {
    /** Stored separately from `lastName` — the DB never holds a joined name. */
    firstName: string
    lastName: string
    phoneNumber: string
    phone?: PhoneNumber
    email?: string
    description?: string
  }
  details: {
    favoriteProviders: BasicProvider[]
    description?: string
    emailVerifiedAt?: string
    emailNotificationPrefs: ConsumerEmailNotificationPrefs
    paymentInfo?: PaymentInfo
  }
}

export type BasicConsumer = Pick<Consumer, 'id' | 'basic'>

export type ConsumerProfileActions = {
  setConsumerProfileState: (payload: Partial<ConsumerProfileState>) => void
}
