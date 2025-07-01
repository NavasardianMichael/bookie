import { AxiosError, isAxiosError } from 'axios'
import { APIResponse, AppError } from '@interfaces/api'

export const processError = (e: unknown): AppError => {
  // Handling errors (as an instance of APIResponse) coming from the API
  // If found, transforming it to AppError
  const error = e as AxiosError<APIResponse<unknown>>
  if (isAxiosError(error) && error?.response?.data?.error) {
    return {
      code: +error.response.data.error.code.toString(),
      message: error.response.data.error.message,
    }
  }
  // Otherwise setting custom error with actual message
  return {
    code: -1,
    message: error.message ?? 'An unknown error occurred',
  }
}
