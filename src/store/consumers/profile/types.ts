import { PhoneNumber } from '@interfaces/app'
import { ConsumerEmailNotificationPrefs, PaymentInfo } from '@interfaces/settings'
import { StateCommonProps } from '@interfaces/store'

export type ConsumerProfileState = StateCommonProps & Consumer

export type Consumer = {
  id: string
  basic: {
    /** One field, as the consumer wrote it — never split into given and family names. */
    fullName: string
    phoneNumber: string
    phone?: PhoneNumber
    email?: string
  }
  /**
   * No `favoriteProviders`: favourites belong to the account, not to the Consumer profile,
   * and are served by `GET /favorites` (`src/api/favorites/`).
   */
  details: {
    emailVerifiedAt?: string
    emailNotificationPrefs: ConsumerEmailNotificationPrefs
    paymentInfo?: PaymentInfo
  }
}

export type BasicConsumer = Pick<Consumer, 'id' | 'basic'>

export type ConsumerProfileActions = {
  setConsumerProfileState: (payload: Partial<ConsumerProfileState>) => void
}
