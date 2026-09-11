import { Endpoint } from '@interfaces/api'
import { PhoneNumber } from '@interfaces/app'
import { PendingGoogleAccount, RegistrationPayload, Session, UserType } from '@interfaces/auth'

/**
 * Registration answers `true` on **every** branch — a taken address, a new one, even a
 * failed send. A 409 for a taken address would turn the route into an oracle for which
 * addresses hold accounts, so its owner is told in their own inbox instead. It does
 * **not** sign anyone in: an unverified account cannot hold a session.
 */
export type RegisterAPI = Endpoint<{
  payload: RegistrationPayload
  response: boolean
  processed: void
}>

export type LoginAPI = Endpoint<{
  payload: { email: string; password: string }
  response: Session
  processed: Session
}>

/** Shared by signup verification and change-email confirm — the same server handler. */
export type VerifyEmailAPI = Endpoint<{
  payload: { token: string }
  response: { email: string; emailVerifiedAt: string }
  processed: { email: string; emailVerifiedAt: string }
}>

export type ResendVerificationAPI = Endpoint<{
  payload: { email: string; locale: string }
  response: boolean
  processed: void
}>

/** Always answers `true`, for the same anti-enumeration reason as registration. */
export type ForgotPasswordAPI = Endpoint<{
  payload: { email: string; locale: string }
  response: boolean
  processed: void
}>

export type ResetPasswordAPI = Endpoint<{
  payload: { token: string; password: string }
  response: boolean
  processed: void
}>

export type ChangePasswordAPI = Endpoint<{
  payload: { currentPassword: string; newPassword: string }
  response: boolean
  processed: void
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

/** No OTP: phone is unverified profile data, so there is nothing to confirm. */
export type ChangePhoneAPI = Endpoint<{
  payload: { phone: PhoneNumber }
  response: { phone: PhoneNumber }
  processed: { phone: PhoneNumber }
}>

export type ChangeEmailSendAPI = Endpoint<{
  payload: { email: string; returnPath: string }
  response: boolean
  processed: void
}>

export type DeleteAccountAPI = Endpoint<{
  payload: void
  response: boolean
  processed: void
}>

/** Reads the pending-Google cookie so the completion form can prefill. */
export type GetGooglePendingAPI = Endpoint<{
  payload: void
  response: PendingGoogleAccount
  processed: PendingGoogleAccount
}>

export type CompleteGoogleAPI = Endpoint<{
  payload: {
    role: UserType
    phone: PhoneNumber
    profile: { firstName: string; lastName: string; country?: string; organizationId?: string; organizationName?: string }
  }
  response: Session
  processed: Session
}>
