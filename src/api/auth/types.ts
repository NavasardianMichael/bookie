import { AuthState } from '@store/auth/types'
import { Endpoint } from '@interfaces/api'
import { LoginResult, RegistrationProfile, Session, UserType } from '@interfaces/auth'

export type GetCodeByPhoneNumberAPI = Endpoint<{
  payload: Pick<AuthState, 'phone'>
  response: boolean
  processed: void
}>

export type ValidatePhoneNumberCodeAPI = Endpoint<{
  payload: Pick<AuthState, 'phone'> & {
    otp: number
    /**
     * Sent by a registration form, which knows the role. Omitted at sign-in, where the
     * server reads the role back off the account that already exists.
     */
    userType?: UserType
    /** Absent when an existing account signs in rather than registers. */
    profile?: RegistrationProfile
  }
  response: LoginResult
  processed: LoginResult
}>

export type GetMeAPI = Endpoint<{
  payload: void
  response: Session
  processed: Session
}>

export type LogoutAPI = Endpoint<{
  payload: void
  response: boolean
  processed: void
}>
