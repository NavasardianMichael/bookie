import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted above the store import — the store imports the API module eagerly.
vi.mock('@api/favorites/main', () => ({
  getFavoriteProviderIdsAPI: vi.fn(),
  putFavoriteProviderAPI: vi.fn(),
  deleteFavoriteProviderAPI: vi.fn(),
}))

// `getFavoriteIds` records a failed load here; silenced so the suite output stays readable.
vi.mock('@helpers/reportError', () => ({ reportError: vi.fn() }))

const { deleteFavoriteProviderAPI, getFavoriteProviderIdsAPI, putFavoriteProviderAPI } = await import(
  '@api/favorites/main'
)
const { useFavoritesListStoreBase } = await import('@store/favorites/list/store')

const EMPTY = { ids: {}, loadedFor: null, isPending: false, error: null }

const state = () => useFavoritesListStoreBase.getState()

describe('favorites list store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFavoritesListStoreBase.setState(EMPTY)
  })

  describe('getFavoriteIds', () => {
    it('stores the ids and which session they belong to', async () => {
      vi.mocked(getFavoriteProviderIdsAPI).mockResolvedValue({ a: true })

      await state().getFavoriteIds('consumer-1')

      expect(state().ids).toEqual({ a: true })
      expect(state().loadedFor).toBe('consumer-1')
      expect(state().isPending).toBe(false)
    })

    /**
     * `useFavoriteProvider` reads the live `isPending` to let only the first of a grid's
     * hearts fetch. So it has to flip before the request resolves, not after.
     */
    it('is pending from the moment it is called', () => {
      vi.mocked(getFavoriteProviderIdsAPI).mockReturnValue(new Promise(() => undefined))

      void state().getFavoriteIds('consumer-1')

      expect(state().isPending).toBe(true)
    })

    /**
     * Left `true`, every heart on the site would believe a load was still in flight and
     * never ask again. `loadedFor` stays null so the next grid retries.
     */
    it('clears pending and leaves the session unloaded when the request fails', async () => {
      vi.mocked(getFavoriteProviderIdsAPI).mockRejectedValue(new Error('offline'))

      await state().getFavoriteIds('consumer-1')

      expect(state().isPending).toBe(false)
      expect(state().loadedFor).toBeNull()
      expect(state().error).not.toBeNull()
    })
  })

  describe('setFavorite', () => {
    it('adds optimistically, before the request settles', () => {
      vi.mocked(putFavoriteProviderAPI).mockReturnValue(new Promise(() => undefined))

      void state().setFavorite({ providerId: 'a', favorite: true })

      expect(state().ids).toEqual({ a: true })
      expect(putFavoriteProviderAPI).toHaveBeenCalledWith({ providerId: 'a' })
    })

    it('removes through the delete endpoint', async () => {
      useFavoritesListStoreBase.setState({ ids: { a: true, b: true } })
      vi.mocked(deleteFavoriteProviderAPI).mockResolvedValue(undefined)

      await state().setFavorite({ providerId: 'a', favorite: false })

      expect(state().ids).toEqual({ b: true })
      expect(deleteFavoriteProviderAPI).toHaveBeenCalledWith({ providerId: 'a' })
      expect(putFavoriteProviderAPI).not.toHaveBeenCalled()
    })

    it('undoes the flip and rethrows when the add fails', async () => {
      const failure = new Error('403')
      vi.mocked(putFavoriteProviderAPI).mockRejectedValue(failure)

      await expect(state().setFavorite({ providerId: 'a', favorite: true })).rejects.toBe(failure)
      expect(state().ids).toEqual({})
    })

    it('undoes the flip and rethrows when the removal fails', async () => {
      useFavoritesListStoreBase.setState({ ids: { a: true } })
      vi.mocked(deleteFavoriteProviderAPI).mockRejectedValue(new Error('offline'))

      await expect(state().setFavorite({ providerId: 'a', favorite: false })).rejects.toThrow('offline')
      expect(state().ids).toEqual({ a: true })
    })
  })
})
