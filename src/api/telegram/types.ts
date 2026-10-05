import { Endpoint } from '@interfaces/api'
import { TelegramStatus } from '@interfaces/settings'

export type GetTelegramStatusAPI = Endpoint<{
  payload: void
  response: TelegramStatus
  processed: TelegramStatus
}>

export type PostTelegramLinkAPI = Endpoint<{
  payload: void
  response: { url: string }
  /** The `t.me/<bot>?start=<token>` deep link, valid for 15 minutes. */
  processed: string
}>

export type DeleteTelegramLinkAPI = Endpoint<{
  payload: void
  response: boolean
  processed: boolean
}>
