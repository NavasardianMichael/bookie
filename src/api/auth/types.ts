import { Endpoint } from "@interfaces/api"
import { Profile } from "@store/profile/types"

export type LoginAPI = Endpoint<{
  payload: {
    email: Profile['email']
    password: string
  }
  response: void
  processed: void
}>

export type RegisterAPI = Endpoint<{
  payload: Pick<Profile, 'email'> & {
    rememberMe: boolean
    password: string
  }
  response: Profile
  processed: Profile
}>

export type LogoutAPI = Endpoint<{
  payload: void
  response: void
  processed: void
}>

export type SendForgotPasswordInstructionsAPI = Endpoint<{
  payload: Pick<Profile, 'email'>
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
    email: Profile['email']
    newPassword: string
    confirmPassword: string
  }
  response: void
  processed: void
}>

export type GetProfileAPI = Endpoint<{
  payload: void
  response: Profile
  processed: Profile
}>

export type Marker = {
  title: string;
  position: string;
};