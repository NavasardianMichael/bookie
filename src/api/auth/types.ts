import { ProviderProfileSlice } from '@store/providers/profile/types'
import { Endpoint } from '@interfaces/api'

export type LoginAPI = Endpoint<{
  payload: {
    email: ProviderProfileSlice['info']['basic']['email']
    password: string
  }
  response: void
  processed: void
}>

export type RegisterAPI = Endpoint<{
  payload: Pick<ProviderProfileSlice['info']['basic'], 'phone'>
  response: ProviderProfileSlice['info']['basic']
  processed: ProviderProfileSlice['info']['basic']
}>

export type LogoutAPI = Endpoint<{
  payload: void
  response: void
  processed: void
}>

export type SendForgotPasswordInstructionsAPI = Endpoint<{
  payload: Pick<ProviderProfileSlice['info']['basic'], 'email'>
  response: void
  processed: void
}>

export type ChangePasswordAPI = Endpoint<{
  payload: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }
  response: void
  processed: void
}>

export type ResetPasswordAPI = Endpoint<{
  payload: {
    token: string
    email: ProviderProfileSlice['info']['basic']['email']
    newPassword: string
    confirmPassword: string
  }
  response: void
  processed: void
}>

export type GetProfileAPI = Endpoint<{
  payload: void
  response: ProviderProfileSlice['info']['basic']
  processed: ProviderProfileSlice['info']['basic']
}>

export type Marker = {
  title: string
  position: string
}
