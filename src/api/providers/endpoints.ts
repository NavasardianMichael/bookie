export const ENDPOINTS = {
  getProvidersList: '/providers',
  getSingleProvider: '/providers',
  /**
   * Intervals this provider is already booked for, so the public grid can grey them
   * out. The id is interpolated in `main.ts`; this holds base paths only.
   */
  getProviderBusy: '/providers',
  getProviderProfile: '/provider-profile',
  putProviderProfile: '/provider-profile',
  patchProviderSeo: '/provider-profile/seo',
  deleteProviderProfile: '/provider-profile',
  postProviderService: '/providers',
  putProviderService: '/providers',
  deleteProviderService: '/providers',
} as const
