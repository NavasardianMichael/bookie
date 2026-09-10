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
  // Otherwise setting custom error with actual message.
  //
  // `error?.message` rather than `error.message`: this is the app's last line of error
  // handling, reached from every `catch`, and `processError(null)` used to throw a
  // `TypeError` of its own — replacing the real failure with a crash inside the handler
  // meant to report it. A thrown non-Error (`throw 'nope'`) lands here the same way.
  return {
    code: -1,
    message: error?.message ?? 'An unknown error occurred',
  }
}
