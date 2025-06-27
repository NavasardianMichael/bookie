import { GetCodeByPhoneNumberAPI, ValidatePhoneNumberCodeAPI } from './types'

export const processGetCodeResponse: GetCodeByPhoneNumberAPI['processor'] = () => {
  return null
}

export const processValidatePhoneNumberCodeResponse: ValidatePhoneNumberCodeAPI['processor'] = (response) => {
  return response.value
}
