import { GetCodeByPhoneNumberAPI, GetMeAPI, LogoutAPI, ValidatePhoneNumberCodeAPI } from './types'

export const processGetCodeResponse: GetCodeByPhoneNumberAPI['processor'] = () => {
  return null
}

export const processValidatePhoneNumberCodeResponse: ValidatePhoneNumberCodeAPI['processor'] = (response) => {
  return response.value
}

export const processGetMeResponse: GetMeAPI['processor'] = (response) => {
  return response.value
}

export const processLogoutResponse: LogoutAPI['processor'] = () => {
  return null
}
