import { AuthState } from '@store/auth/types'
import { Endpoint } from '@interfaces/api'

export type GetCodeByPhoneNumberAPI = Endpoint<{
  payload: Pick<AuthState, 'phone'>
  response: boolean
  processed: void
}>

export type ValidatePhoneNumberCodeAPI = Endpoint<{
  payload: Pick<AuthState, 'phone'> & { otp: number }
  response: boolean
  processed: void
}>
