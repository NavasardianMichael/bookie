import { AuthState } from '@store/auth/types'
import { Endpoint } from '@interfaces/api'
import { UserType } from '@interfaces/auth'

export type GetCodeByPhoneNumberAPI = Endpoint<{
  payload: Pick<AuthState, 'phone'>
  response: boolean
  processed: void
}>

export type ValidatePhoneNumberCodeAPI = Endpoint<{
  payload: Pick<AuthState, 'phone'> & { otp: number; userType: UserType }
  response: boolean
  processed: void
}>
