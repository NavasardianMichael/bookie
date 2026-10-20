import { Consumer } from '@store/consumers/profile/types'
import { Endpoint } from '@interfaces/api'
import { ConsumerEmailNotificationPrefs, PaymentInfo } from '@interfaces/settings'

export type ConsumerProfileResponse = Consumer

export type PutConsumerProfileRequestPayload = Partial<{
  fullName: string
  emailNotificationPrefs: ConsumerEmailNotificationPrefs
  paymentInfo: PaymentInfo | null
}>

export type GetConsumerProfileAPI = Endpoint<{
  payload: void
  response: ConsumerProfileResponse
  processed: Consumer
}>

export type PutConsumerProfileAPI = Endpoint<{
  payload: PutConsumerProfileRequestPayload
  response: ConsumerProfileResponse
  processed: Consumer
}>
