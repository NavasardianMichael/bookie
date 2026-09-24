import { PutFavoriteProviderAPI } from '@api/favorites/types'
import { BasicProvider } from '@store/providers/list/types'
import { StateCommonProps } from '@interfaces/store'

/**
 * A set of provider ids, as a record rather than an array: every heart on a grid asks
 * "is this one in?", and a record answers that without a scan.
 */
export type FavoriteProviderIds = Record<BasicProvider['id'], true>

/**
 * Only the ids, never the providers. This slice exists for the hearts — one per card, on
 * every grid, all reading the same answer — which is client interactivity. The
 * `/favorites` page lists the providers themselves from a Server Component and does not
 * read this store.
 */
export type FavoritesListState = StateCommonProps & {
  ids: FavoriteProviderIds
  /**
   * The session profile the ids were loaded for; `null` until a load has answered.
   *
   * Compared against the auth store's `profileId` rather than kept as a boolean, so a
   * sign-out followed by a sign-in as someone else in the same tab reloads instead of
   * painting the previous account's hearts.
   */
  loadedFor: string | null
}

export type FavoritesListActions = {
  setFavoritesListState: (payload: Partial<FavoritesListState>) => void
  getFavoriteIds: (profileId: string) => Promise<void>
  /**
   * Optimistic: the heart flips before the request and flips back if it fails. Rejects
   * on failure so the caller can say so — the store only undoes the flip.
   */
  setFavorite: (args: PutFavoriteProviderAPI['payload'] & { favorite: boolean }) => Promise<void>
}
