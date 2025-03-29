import {
  ChangePasswordAPI,
  GetProfileAPI,
  InviteUserAPI,
  RegisterAPI,
  ResetPasswordAPI,
  SendForgotPasswordInstructionsAPI,
  VerifyTokenAPI,
} from './types'

export const processRegisterResponse: RegisterAPI['processor'] = (response) => {
  return response.value
}

export const processLogoutResponse: RegisterAPI['processor'] = (response) => {
  return response.value
}

export const processSendForgotPasswordInstructionsResponse: SendForgotPasswordInstructionsAPI['processor'] = (
  response
) => {
  return response.value
}

export const processChangePasswordResponse: ChangePasswordAPI['processor'] = (response) => {
  return response.value
}

export const processIniviteUserResponse: InviteUserAPI['processor'] = (response) => {
  return response.value
}

export const processVerifyTokenResponse: VerifyTokenAPI['processor'] = (response) => {
  return response.value
}

export const processResetPasswordResponse: ResetPasswordAPI['processor'] = (response) => {
  return response.value
}

export const processProfileResponse: GetProfileAPI['processor'] = (response) => {
  return response.value
}
