import { FavoriteProviderIds } from '@store/favorites/list/types'
import { BasicProvider } from '@store/providers/list/types'
import { Endpoint } from '@interfaces/api'

export type GetFavoriteProvidersAPI = Endpoint<{
  payload: {
    /**
     * Transport-only, as `GetSingleProviderAPI`'s is: the `/favorites` page is a Server
     * Component, and the list is the session's own, so it has to forward the cookie.
     */
    cookie?: string
  }
  response: BasicProvider[]
  processed: BasicProvider[]
}>

export type GetFavoriteProviderIdsAPI = Endpoint<{
  payload: void
  response: BasicProvider['id'][]
  processed: FavoriteProviderIds
}>

/** Idempotent on the API: favouriting twice is still one favourite. */
export type PutFavoriteProviderAPI = Endpoint<{
  payload: { providerId: BasicProvider['id'] }
}>

export type DeleteFavoriteProviderAPI = Endpoint<{
  payload: { providerId: BasicProvider['id'] }
}>
