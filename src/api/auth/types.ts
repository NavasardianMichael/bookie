import { Endpoint } from '@interfaces/api'

export type GetCodeByPhoneNumberAPI = Endpoint<{
  payload: { phoneNumber: string }
  response: void
  processed: void
}>

export type ValidatePhoneNumberCodeAPI = Endpoint<{
  payload: { phoneNumber: string; code: number }
  response: void
  processed: void
}>
