export const ENDPOINTS = {
  getPlans: '/plans',
  getProviderPlan: '/provider-profile/plan',
  getAdminProviders: '/admin/providers',
  /** `/admin/providers/<id>/plan` — the id is interpolated in `main.ts`. */
  patchAdminProviderPlan: '/admin/providers',
} as const
