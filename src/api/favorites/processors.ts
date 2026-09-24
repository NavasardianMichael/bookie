import { FavoriteProviderIds } from '@store/favorites/list/types'
import { GetFavoriteProviderIdsAPI, GetFavoriteProvidersAPI } from './types'

/**
 * Kept as an array rather than normalized, for the reason `processProviderReviewsResponse`
 * gives: the page renders these in the API's order (newest favourite first) and never
 * looks one up by id.
 */
export const processFavoriteProvidersResponse: GetFavoriteProvidersAPI['processor'] = (response) =>
  response.value ?? []

export const processFavoriteProviderIdsResponse: GetFavoriteProviderIdsAPI['processor'] = (response) =>
  (response.value ?? []).reduce<FavoriteProviderIds>((ids, id) => {
    ids[id] = true
    return ids
  }, {})
