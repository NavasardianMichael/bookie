import {
  ChangePasswordAPI,
  GetProfileAPI,
  RegisterAPI,
  ResetPasswordAPI,
  SendForgotPasswordInstructionsAPI,
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

export const processResetPasswordResponse: ResetPasswordAPI['processor'] = (response) => {
  return response.value
}

export const processProfileResponse: GetProfileAPI['processor'] = (response) => {
  return response.value
}
