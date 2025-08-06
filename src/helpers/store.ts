import { StateCreator } from 'zustand'
import { StateCommonProps } from '@interfaces/store'
import { processError } from './error'

export const errorMiddleware = <T extends Pick<StateCommonProps, 'error'>>(
  config: StateCreator<T>
): StateCreator<T> => {
  return (set, get, api) => {
    api.setState = (partial) => {
      try {
        set(partial)
      } catch (error) {
        console.error('Zustand error caught by middleware:', error)
        const processedError = processError(error)
        set((state) => {
          return {
            ...state,
            error: processedError,
          }
        })
      }
    }
    return config(set, get, api)
  }
}
