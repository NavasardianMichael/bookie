import { Endpoint } from '@interfaces/api'

export type GetCodeByPhoneNumberAPI = Endpoint<{
  payload: { phoneNumber: string }
  response: boolean
  processed: void
}>

export type ValidatePhoneNumberCodeAPI = Endpoint<{
  payload: { phoneNumber: string; otp: string }
  response: boolean
  processed: void
}>
