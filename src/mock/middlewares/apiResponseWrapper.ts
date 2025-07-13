import { NextFunction, Request, Response } from 'express'
import { APIResponse } from '@interfaces/api'

// Extend Express Response type to include our custom methods
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Response {
      customSuccessResponse<T>(data: T, statusCode?: number): Response
      customErrorResponse(message: string, statusCode?: number): Response
    }
  }
}

export const apiResponseWrapper = (_req: Request, res: Response, next: NextFunction) => {
  // Success response method
  res.customSuccessResponse = function <T>(data: T, statusCode: number = 200): Response {
    const response: APIResponse<T> = {
      value: data,
      error: null,
    }
    return this.status(statusCode).json(response)
  }

  // Error response method
  res.customErrorResponse = function (message: string, statusCode: number = 500): Response {
    const response: APIResponse<null> = {
      value: null,
      error: {
        message,
        code: statusCode,
      },
    }
    return this.status(statusCode).json(response)
  }

  next()
}
