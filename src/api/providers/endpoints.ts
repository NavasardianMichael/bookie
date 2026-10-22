export const ENDPOINTS = {
  getProvidersList: '/providers',
  getSingleProvider: '/providers',
  /**
   * Intervals this provider is already booked for, so the public grid can grey them
   * out. The id is interpolated in `main.ts`; this holds base paths only.
   */
  getProviderBusy: '/providers',
  /** Every listed provider's page key and change stamp — the sitemap and `llms.txt`. */
  getProvidersSitemap: '/providers/sitemap',
  getProviderProfile: '/provider-profile',
  putProviderProfile: '/provider-profile',
  patchProviderSeo: '/provider-profile/seo',
  patchProviderOrganization: '/provider-profile/organization',
  putProviderCategories: '/provider-profile/categories',
  deleteProviderProfile: '/provider-profile',
  postProviderService: '/providers',
  putProviderService: '/providers',
  deleteProviderService: '/providers',
} as const
