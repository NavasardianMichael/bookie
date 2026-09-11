import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import {
  processChangeEmailSendResponse,
  processChangePasswordResponse,
  processChangePhoneResponse,
  processCompleteGoogleResponse,
  processDeleteAccountResponse,
  processForgotPasswordResponse,
  processGetMeResponse,
  processGooglePendingResponse,
  processLoginResponse,
  processLogoutResponse,
  processRegisterResponse,
  processResendVerificationResponse,
  processResetPasswordResponse,
  processVerifyEmailResponse,
} from './processors'
import {
  ChangeEmailSendAPI,
  ChangePasswordAPI,
  ChangePhoneAPI,
  CompleteGoogleAPI,
  DeleteAccountAPI,
  ForgotPasswordAPI,
  GetGooglePendingAPI,
  GetMeAPI,
  LoginAPI,
  LogoutAPI,
  RegisterAPI,
  ResendVerificationAPI,
  ResetPasswordAPI,
  VerifyEmailAPI,
} from './types'

export const registerAPI: RegisterAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<RegisterAPI['response']>>(ENDPOINTS.register, params)
  return processRegisterResponse(data)
}

export const loginAPI: LoginAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<LoginAPI['response']>>(ENDPOINTS.login, params)
  return processLoginResponse(data)
}

export const verifyEmailAPI: VerifyEmailAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<VerifyEmailAPI['response']>>(ENDPOINTS.verifyEmail, params)
  return processVerifyEmailResponse(data)
}

/**
 * Confirms an email **change**, as opposed to a signup address.
 *
 * The server runs one handler for both and this could post to `/verify-email` instead — but
 * that route is public, while this one sits behind `requireAuth`. A change is only ever
 * started from a session, so the authed path is the honest one to use.
 */
export const changeEmailConfirmAPI: VerifyEmailAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<VerifyEmailAPI['response']>>(
    ENDPOINTS.changeEmailConfirm,
    params
  )
  return processVerifyEmailResponse(data)
}

export const resendVerificationAPI: ResendVerificationAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ResendVerificationAPI['response']>>(
    ENDPOINTS.resendVerification,
    params
  )
  return processResendVerificationResponse(data)
}

export const forgotPasswordAPI: ForgotPasswordAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ForgotPasswordAPI['response']>>(
    ENDPOINTS.forgotPassword,
    params
  )
  return processForgotPasswordResponse(data)
}

export const resetPasswordAPI: ResetPasswordAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ResetPasswordAPI['response']>>(ENDPOINTS.resetPassword, params)
  return processResetPasswordResponse(data)
}

export const changePasswordAPI: ChangePasswordAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ChangePasswordAPI['response']>>(
    ENDPOINTS.changePassword,
    params
  )
  return processChangePasswordResponse(data)
}

export const getMeAPI: GetMeAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetMeAPI['response']>>(ENDPOINTS.me)
  return processGetMeResponse(data)
}

export const logoutAPI: LogoutAPI['api'] = async () => {
  const { data } = await axiosInstance.post<APIResponse<LogoutAPI['response']>>(ENDPOINTS.logout)
  return processLogoutResponse(data)
}

export const changePhoneAPI: ChangePhoneAPI['api'] = async (params) => {
  const { data } = await axiosInstance.patch<APIResponse<ChangePhoneAPI['response']>>(ENDPOINTS.changePhone, params)
  return processChangePhoneResponse(data)
}

export const changeEmailSendAPI: ChangeEmailSendAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<ChangeEmailSendAPI['response']>>(
    ENDPOINTS.changeEmailSend,
    params
  )
  return processChangeEmailSendResponse(data)
}

export const deleteAccountAPI: DeleteAccountAPI['api'] = async () => {
  const { data } = await axiosInstance.delete<APIResponse<DeleteAccountAPI['response']>>(ENDPOINTS.deleteAccount)
  return processDeleteAccountResponse(data)
}

export const getGooglePendingAPI: GetGooglePendingAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetGooglePendingAPI['response']>>(ENDPOINTS.googlePending)
  return processGooglePendingResponse(data)
}

export const completeGoogleAPI: CompleteGoogleAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<CompleteGoogleAPI['response']>>(
    ENDPOINTS.googleComplete,
    params
  )
  return processCompleteGoogleResponse(data)
}

/**
 * The absolute URL to hand `window.location` to start Google sign-in.
 *
 * Not an axios call, and deliberately so: the flow is a chain of top-level navigations —
 * to Google, back to the API's callback, then on to the web app — and the API sets the
 * session cookie on its own origin during it. Fetching this would follow the chain
 * invisibly and leave the browser exactly where it started.
 *
 * `returnPath` must be one of the paths `lib/return-path.ts` allow-lists; anything else is
 * ignored server-side and the flow falls back to the sign-in page.
 */
export const buildGoogleSignInUrl = (args: {
  intent?: 'signin' | 'link'
  role?: string
  returnPath?: string
}): string => {
  // Read off the instance rather than the environment again: `axiosInstance` already owns
  // the API origin and its fallback, and a third copy is a third thing to keep in step.
  const origin = axiosInstance.defaults.baseURL ?? ''
  const url = new URL(ENDPOINTS.google, origin.endsWith('/') ? origin : `${origin}/`)
  url.searchParams.set('intent', args.intent ?? 'signin')
  if (args.role) url.searchParams.set('role', args.role)
  if (args.returnPath) url.searchParams.set('returnPath', args.returnPath)
  return url.toString()
}
