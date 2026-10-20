export const ENDPOINTS = {
  getPlans: '/plans',
  /** Every add-on, what it adds, costs, and which plans already include it. Public. */
  getAddons: '/plans/addons',
  getProviderPlan: '/provider-profile/plan',
  getAdminProviders: '/admin/providers',
  /** `/admin/providers/<id>/plan` — the id is interpolated in `main.ts`. */
  patchAdminProviderPlan: '/admin/providers',
  /** `/admin/providers/<id>/addons` — the id is interpolated in `main.ts`. */
  patchAdminProviderAddons: '/admin/providers',
} as const
