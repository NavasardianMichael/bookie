import { Endpoint } from '@interfaces/api'

export type GetCalendarFeedAPI = Endpoint<{
  payload: void
  response: { url: string }
  processed: string
}>

export type RotateCalendarFeedAPI = Endpoint<{
  payload: void
  response: { url: string }
  processed: string
}>
