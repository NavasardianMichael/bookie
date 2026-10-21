import { Endpoint } from '@interfaces/api'
import { DirectoryPresence } from '@constants/header'

export type GetDirectoryPresenceAPI = Endpoint<{
  payload: void
  response: DirectoryPresence
  processed: DirectoryPresence
}>
