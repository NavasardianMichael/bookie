import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { deleteFavoriteProviderAPI, getFavoriteProviderIdsAPI, putFavoriteProviderAPI } from '@api/favorites/main'
import { appendSelectors } from '@store/appendSelectors'
import { processError } from '@helpers/error'
import { reportError } from '@helpers/reportError'
import { FavoritesListActions, FavoritesListState } from './types'

const initialState: FavoritesListState = {
  ids: {},
  loadedFor: null,
  isPending: false,
  error: null,
}

export const useFavoritesListStoreBase = create<FavoritesListState & FavoritesListActions>()(
  immer(
    combine(
      initialState,
      (set): FavoritesListActions => ({
        setFavoritesListState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        /**
         * `try/finally`, as the auth store does: `useFavoriteProvider` reads `isPending` to
         * decide whether a load is already in flight, so leaving it `true` after a rejection
         * would stop every heart on the site from ever loading again.
         *
         * A failure is recorded rather than thrown. The hearts then paint as "not
         * favourited" — the one wrong answer that fixes itself, since a tap is an
         * idempotent write — and `loadedFor` stays `null`, so the next grid retries.
         */
        getFavoriteIds: async (profileId) => {
          set({ isPending: true, error: null })
          try {
            const ids = await getFavoriteProviderIdsAPI()
            set({ ids, loadedFor: profileId })
          } catch (error) {
            reportError(error, 'favorites:ids')
            set({ error: processError(error) })
          } finally {
            set({ isPending: false })
          }
        },
        setFavorite: async ({ providerId, favorite }) => {
          set((state) => {
            if (favorite) state.ids[providerId] = true
            else delete state.ids[providerId]
          })

          try {
            await (favorite ? putFavoriteProviderAPI : deleteFavoriteProviderAPI)({ providerId })
          } catch (error) {
            set((state) => {
              if (favorite) delete state.ids[providerId]
              else state.ids[providerId] = true
            })
            throw error
          }
        },
      })
    )
  )
)

export const useFavoritesListStore = appendSelectors(useFavoritesListStoreBase)
