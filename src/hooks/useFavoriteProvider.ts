'use client'

import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@store/auth/store'
import { useFavoritesListStore, useFavoritesListStoreBase } from '@store/favorites/list/store'
import { BasicProvider } from '@store/providers/list/types'
import { USER_TYPES } from '@constants/auth'

type UseFavoriteProvider = {
  isSignedOn: boolean
  isFavorite: boolean
  /**
   * The heart is not offered on the viewer's own card. A session resolves provider-first,
   * so an account holding a Provider profile always carries its id as `profileId` — which
   * makes this one comparison sufficient. The API refuses the write regardless.
   */
  isOwn: boolean
  /** Rejects when the write fails; the store has already undone the optimistic flip. */
  toggle: () => Promise<void>
}

/**
 * One provider's favourite state, for a heart on a card.
 *
 * **The ids load once per session, however many cards mount.** A grid mounts every heart
 * in one commit, and each effect sees the render-time snapshot of the store, so reading
 * `isPending` from the hook would let all of them fetch. The effect reads the store's
 * *live* state instead: the first call sets `isPending` synchronously, before its
 * request, so every later effect in the same commit sees it and stands down.
 */
export const useFavoriteProvider = (providerId: BasicProvider['id']): UseFavoriteProvider => {
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const profileId = useAuthStore.use.profileId()
  const ids = useFavoritesListStore.use.ids()
  const loadedFor = useFavoritesListStore.use.loadedFor()
  const getFavoriteIds = useFavoritesListStore.use.getFavoriteIds()
  const setFavorite = useFavoritesListStore.use.setFavorite()

  const isOwn = userType === USER_TYPES.provider && profileId === providerId
  // Gated on the session so a signed-out tab never paints the previous account's hearts.
  const isFavorite = isSignedOn && loadedFor === profileId && Boolean(ids[providerId])

  useEffect(() => {
    if (!isSignedOn || !profileId || loadedFor === profileId) return
    if (useFavoritesListStoreBase.getState().isPending) return
    void getFavoriteIds(profileId)
  }, [getFavoriteIds, isSignedOn, loadedFor, profileId])

  const toggle = useCallback(
    () => setFavorite({ providerId, favorite: !isFavorite }),
    [isFavorite, providerId, setFavorite]
  )

  return { isSignedOn, isFavorite, isOwn, toggle }
}
