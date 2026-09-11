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

/**
 * The void-returning ones all answer a bare `true`, which carries no information a caller
 * can act on — success is the absence of a rejection. They return `null` rather than that
 * boolean so nothing downstream is tempted to branch on it.
 */
const processVoid = () => null

export const processRegisterResponse: RegisterAPI['processor'] = processVoid
export const processResendVerificationResponse: ResendVerificationAPI['processor'] = processVoid
export const processForgotPasswordResponse: ForgotPasswordAPI['processor'] = processVoid
export const processResetPasswordResponse: ResetPasswordAPI['processor'] = processVoid
export const processChangePasswordResponse: ChangePasswordAPI['processor'] = processVoid
export const processLogoutResponse: LogoutAPI['processor'] = processVoid
export const processChangeEmailSendResponse: ChangeEmailSendAPI['processor'] = processVoid
export const processDeleteAccountResponse: DeleteAccountAPI['processor'] = processVoid

export const processLoginResponse: LoginAPI['processor'] = (response) => response.value

export const processVerifyEmailResponse: VerifyEmailAPI['processor'] = (response) => response.value

export const processGetMeResponse: GetMeAPI['processor'] = (response) => response.value

export const processChangePhoneResponse: ChangePhoneAPI['processor'] = (response) => response.value

export const processGooglePendingResponse: GetGooglePendingAPI['processor'] = (response) => response.value

export const processCompleteGoogleResponse: CompleteGoogleAPI['processor'] = (response) => response.value
