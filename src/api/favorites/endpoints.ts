export const ENDPOINTS = {
  getFavoriteProviders: '/favorites',
  getFavoriteProviderIds: '/favorites/ids',
  /** `/favorites/<providerId>` — the id is interpolated in `main.ts`, never stored here. */
  putFavoriteProvider: '/favorites',
  deleteFavoriteProvider: '/favorites',
} as const
